const cheerio = require('cheerio');
const HOST='https://school.jbedu.kr';
const SOURCE=HOST+'/bongseo-m/M010302/list.do';
const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const dateRe=/\b(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})\b/;
function parseCalendar(html,year,month){
 const $=cheerio.load(html), out=[], seen=new Set();
 const monthPrefix=`${year}-${String(month).padStart(2,'0')}`;
 function add(date,title){title=clean(title).replace(/^[\s\-–•:]+/,'');if(!title||title.length>150||/^(학사일정|일정표|TOP|이전|다음)$/.test(title))return;
  if(!date.startsWith(monthPrefix))return;const key=date+'|'+title;if(seen.has(key))return;seen.add(key);out.push({id:'school-'+date+'-'+out.length,date,title,kind:'school',repeat:'none',source:SOURCE+`?y=${year}&m=${month}`});}
 // The official page has a dated list below its monthly grid. Prefer date-labelled list entries.
 $('li,dt,dd,tr,p').each((_,node)=>{
  const el=$(node), direct=el.clone();direct.children().remove();const directText=clean(direct.text());
  const text=directText||clean(el.text());const match=text.match(dateRe);
  if(!match)return;
  const date=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  if(!date.startsWith(monthPrefix))return;
  let titles=[];
  // Same element: date and schedule separated by markup or line break.
  const rest=clean(text.replace(dateRe,''));if(rest&&rest.length<120)titles.push(rest);
  // A dated list item often contains nested schedule text.
  el.children('ul,ol,div,p,span,a').each((_,child)=>{const t=clean($(child).text());if(t&&!dateRe.test(t)&&t.length<120)titles.push(t)});
  // Date and schedule in adjacent sibling elements (date heading then list).
  if(!titles.length){const sibling=el.next();if(sibling.length){sibling.find('li').each((_,li)=>titles.push(clean($(li).text())));if(!titles.length)titles.push(clean(sibling.text()))}}
  titles.filter(t=>t&&!dateRe.test(t)).forEach(t=>add(date,t));
 });
 // Alternative: calendar table cells with explicit day numbers and titles.
 if(!out.length){$('table td').each((_,node)=>{const cell=$(node),raw=clean(cell.text());const m=raw.match(/^(\d{1,2})\s+(.+)$/);if(!m)return;const day=Number(m[1]);if(day<1||day>new Date(year,month,0).getDate())return;const title=clean(m[2]);if(title&&title.length<100)add(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,title)})}
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
exports.handler=async(event)=>{
 const q=event.queryStringParameters||{};const year=Number(q.year),month=Number(q.month);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=1800'};
 if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>12)return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'연도 또는 월이 올바르지 않습니다.'})};
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  let response;try{response=await fetch(`${SOURCE}?y=${year}&m=${month}`,{headers:{'User-Agent':'BongseoCalendar/2.0 (school schedule public read)','Accept':'text/html'},signal:controller.signal})}finally{clearTimeout(timeout)}
  if(!response.ok)throw Error(`학교 홈페이지 HTTP ${response.status}`);
  const html=await response.text();if(!html.includes('학사일정'))throw Error('학교 홈페이지 응답이 학사일정 페이지가 아닙니다.');
  const events=parseCalendar(html,year,month);
  // No items is not a verified empty month: avoid replacing good cached data with an unvalidated parse.
  if(!events.length)throw Error('일정을 추출하지 못했습니다. 홈페이지 HTML 구조를 확인해야 합니다.');
  return {statusCode:200,headers,body:JSON.stringify({ok:true,year,month,events,source:`${SOURCE}?y=${year}&m=${month}`,fetchedAt:new Date().toISOString()})};
 }catch(e){return {statusCode:502,headers,body:JSON.stringify({ok:false,error:String(e.message||e)})}}
};
exports._parseCalendar=parseCalendar;
