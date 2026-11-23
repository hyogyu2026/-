const ROOT='https://open.neis.go.kr/hub/';
const REGION='P10';
// Public NEIS data only. Never return the upstream URL (which contains the API key).
// Netlify CDN cache is shared across function instances. Browser caching is short.
const json=(statusCode,body,ttl=0)=>({statusCode,headers:{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':statusCode===200?'public, max-age=60':'no-store',
 ...(statusCode===200?{'Netlify-CDN-Cache-Control':`public, s-maxage=${ttl}, stale-while-revalidate=300`, 'Vary':'Accept-Encoding'}:{})
},body:JSON.stringify(body)});
// Best-effort per-instance abuse guard. This is NOT a distributed rate limiter.
const buckets=new Map();
function allowed(event){
 const ip=(event.headers?.['x-nf-client-connection-ip']||event.headers?.['client-ip']||'unknown').slice(0,80);
 const now=Date.now();if(buckets.size>3000){for(const [k,v] of buckets){if(now-v.start>60000)buckets.delete(k)}}
 const b=buckets.get(ip);if(!b||now-b.start>60000){buckets.set(ip,{start:now,count:1});return true}
 b.count++;return b.count<=45;
}

const clean=s=>String(s||'').trim();
async function query(service,params){
 const u=new URL(ROOT+service);u.searchParams.set('Type','json');u.searchParams.set('pIndex','1');u.searchParams.set('pSize','1000');
 if(process.env.NEIS_API_KEY)u.searchParams.set('KEY',process.env.NEIS_API_KEY);
 Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
 try{const r=await fetch(u,{signal:ctl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('나이스 서버 응답 '+r.status);const j=await r.json();const section=j[service];if(section){return section.find(x=>Array.isArray(x.row))?.row||[]}
 const result=j.RESULT||{};if(result.CODE==='INFO-200')return [];
 throw Error('나이스 응답: '+(result.MESSAGE||'조회 실패')+' ('+(result.CODE||'unknown')+')');
 }finally{clearTimeout(timer)}
}
exports.handler=async(event)=>{const q=event.queryStringParameters||{},action=q.action;
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET 요청만 지원합니다.'});
 if(!allowed(event))return json(429,{ok:false,error:'요청이 너무 많습니다. 잠시 후 다시 시도하세요.'});
 try{
  if(action==='search'){
   const term=clean(q.q);if(term.length<2||term.length>50)return json(400,{ok:false,error:'학교명을 2자 이상 입력하세요.'});
   const rows=await query('schoolInfo',{ATPT_OFCDC_SC_CODE:REGION,SCHUL_NM:term});
   return json(200,{ok:true,schools:rows.filter(x=>x.SCHUL_KND_SC_NM==='중학교').slice(0,80).map(x=>({id:x.SD_SCHUL_CODE,name:x.SCHUL_NM,atpt:x.ATPT_OFCDC_SC_CODE||REGION,address:x.ORG_RDNMA||'',homepage:x.HMPG_ADRES||''}))},21600);
  }
  const code=clean(q.code),atpt=clean(q.atpt||REGION);
  if(!/^\d{7,12}$/.test(code)||atpt!==REGION)return json(400,{ok:false,error:'전북 중학교 코드가 올바르지 않습니다.'});
  if(action==='calendar'){
   const year=Number(q.year),month=Number(q.month);if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>12)return json(400,{ok:false,error:'조회 월 오류'});
   const from=`${year}${String(month).padStart(2,'0')}01`,to=`${year}${String(month).padStart(2,'0')}${String(new Date(year,month,0).getDate()).padStart(2,'0')}`;
   const rows=await query('SchoolSchedule',{ATPT_OFCDC_SC_CODE:atpt,SD_SCHUL_CODE:code,AA_FROM_YMD:from,AA_TO_YMD:to});
   return json(200,{ok:true,events:rows.filter(x=>/^\d{8}$/.test(x.AA_YMD||'')).map((x,i)=>({id:'neis-'+code+'-'+x.AA_YMD+'-'+i,date:x.AA_YMD.slice(0,4)+'-'+x.AA_YMD.slice(4,6)+'-'+x.AA_YMD.slice(6),title:clean(x.EVENT_NM),kind:'school',repeat:'none',source:'NEIS'})).filter(x=>x.title),source:'NEIS'},3600);
  }
  if(action==='meals'){
   const date=clean(q.date);if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))return json(400,{ok:false,error:'날짜 형식 오류'});
   const d=new Date(date+'T12:00:00');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==date)return json(400,{ok:false,error:'날짜 오류'});
   const start=new Date(d);start.setDate(start.getDate()-((start.getDay()+6)%7));const end=new Date(start);end.setDate(end.getDate()+6);
   const ymd=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0');
   const rows=await query('mealServiceDietInfo',{ATPT_OFCDC_SC_CODE:atpt,SD_SCHUL_CODE:code,MLSV_FROM_YMD:ymd(start),MLSV_TO_YMD:ymd(end)});
   return json(200,{ok:true,items:rows.filter(x=>/^\d{8}$/.test(x.MLSV_YMD||'')).map(x=>({date:x.MLSV_YMD.slice(0,4)+'-'+x.MLSV_YMD.slice(4,6)+'-'+x.MLSV_YMD.slice(6),menu:clean(x.DDISH_NM).replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/\([^)]*\)/g,'').trim(),mealType:x.MMEAL_SC_NM||''})).filter(x=>x.menu),source:'NEIS'},3600);
  }
  return json(400,{ok:false,error:'요청 유형 오류'});
 }catch(e){return json(502,{ok:false,error:clean(e.message).slice(0,180)})}
};
