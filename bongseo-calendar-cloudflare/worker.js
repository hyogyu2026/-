// Cloudflare Worker: public NEIS school search, schedules, meals.
// Secret NEIS_API_KEY is read only on the server, never returned to browsers.
const REGION='P10';
const BASE='https://open.neis.go.kr/hub/';
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const trim=x=>String(x??'').trim();
const digits=x=>/^\d{7,12}$/.test(trim(x));
const fmt=d=>`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
async function neis(service, params, env) {
  const key = String(env.NEIS_API_KEY || "").trim();

  if (!key) {
    throw new Error("NEIS_API_KEY 환경변수가 등록되지 않았습니다.");
  }

  const url = new URL("https://open.neis.go.kr/hub/" + service);
  // url.searchParams.set("KEY", key);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "100");

  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }

  let response;

  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    console.error("NEIS network failure", {
      service,
      error: error.name
    });
    throw new Error("나이스 API 연결 실패 또는 시간 초과");
  }

  if (!response.ok) {
    console.error("NEIS HTTP error", {
      service,
      status: response.status
    });
    throw new Error(`나이스 API HTTP 오류: ${response.status}`);
  }

  let data;

  try {
    data = await response.json();
  } catch {
    console.error("NEIS invalid JSON", { service });
    throw new Error("나이스 API 응답 형식 오류");
  }

  const entries = data[service];

  if (Array.isArray(entries)) {
    return entries.find(item => Array.isArray(item.row))?.row || [];
  }

  const result = data.RESULT || {};

  if (result.CODE === "INFO-200") {
    return [];
  }

  console.error("NEIS application error", {
    service,
    code: result.CODE || "UNKNOWN"
  });

  throw new Error(
    `나이스 API 오류: ${result.CODE || "UNKNOWN"} - ${
      String(result.MESSAGE || "알 수 없는 오류").slice(0, 100)
    }`
  );
}
async function lookupBongseo(env){
  const rows=await neis('schoolInfo',{ATPT_OFCDC_SC_CODE:REGION,SCHUL_NM:'봉서중학교'},env);
  const exact=rows.find(x=>x.SCHUL_NM==='봉서중학교'&&x.SCHUL_KND_SC_NM==='중학교');
  if(!exact)throw new Error('봉서중학교의 나이스 학교 코드를 찾지 못했습니다.');
  return exact.SD_SCHUL_CODE;
}
async function execute(u,env){
 const action=u.searchParams.get('action');const term=trim(u.searchParams.get('q'));
 if(action==='search'){
   if(term.length<2||term.length>50)return json({ok:false,error:'학교명을 2~50자로 입력하세요.'},400);
   const rows=await neis('schoolInfo',{ATPT_OFCDC_SC_CODE:REGION,SCHUL_NM:term},env);
   return json({ok:true,schools:rows.filter(x=>x.SCHUL_KND_SC_NM==='중학교').slice(0,80).map(x=>({id:x.SD_SCHUL_CODE,name:x.SCHUL_NM,atpt:REGION,address:x.ORG_RDNMA||'',homepage:x.HMPG_ADRES||''}))});
 }
 let code=trim(u.searchParams.get('code'));
 if(!code && u.searchParams.get('school')==='bongseo-m')code=await lookupBongseo(env);
 if(!digits(code)||trim(u.searchParams.get('atpt')||REGION)!==REGION)return json({ok:false,error:'학교 코드가 올바르지 않습니다.'},400);
 if(action==='calendar'){
   const year=Number(u.searchParams.get('year')),month=Number(u.searchParams.get('month'));
   if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>12)return json({ok:false,error:'조회 월이 올바르지 않습니다.'},400);
   const start=`${year}${String(month).padStart(2,'0')}01`,end=`${year}${String(month).padStart(2,'0')}${String(new Date(Date.UTC(year,month,0)).getUTCDate()).padStart(2,'0')}`;
   const rows=await neis('SchoolSchedule',{ATPT_OFCDC_SC_CODE:REGION,SD_SCHUL_CODE:code,AA_FROM_YMD:start,AA_TO_YMD:end},env);
   return json({ok:true,events:rows.filter(x=>/^\d{8}$/.test(x.AA_YMD||'')).map((x,i)=>({id:`neis-${code}-${x.AA_YMD}-${i}`,date:`${x.AA_YMD.slice(0,4)}-${x.AA_YMD.slice(4,6)}-${x.AA_YMD.slice(6)}`,title:trim(x.EVENT_NM),kind:'school',repeat:'none',source:'NEIS'})).filter(x=>x.title),source:'NEIS'});
 }
 if(action==='meals'){
   const date=trim(u.searchParams.get('date'));
   if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))return json({ok:false,error:'날짜 형식 오류'},400);
   const d=new Date(date+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==date)return json({ok:false,error:'날짜 오류'},400);
   const monday=new Date(d);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));const sunday=new Date(monday);sunday.setUTCDate(sunday.getUTCDate()+6);
   const rows=await neis('mealServiceDietInfo',{ATPT_OFCDC_SC_CODE:REGION,SD_SCHUL_CODE:code,MLSV_FROM_YMD:fmt(monday),MLSV_TO_YMD:fmt(sunday)},env);
   return json({ok:true,items:rows.filter(x=>/^\d{8}$/.test(x.MLSV_YMD||'')).map(x=>({date:`${x.MLSV_YMD.slice(0,4)}-${x.MLSV_YMD.slice(4,6)}-${x.MLSV_YMD.slice(6)}`,menu:trim(x.DDISH_NM).replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/\([^)]*\)/g,'').trim(),mealType:x.MMEAL_SC_NM||''})).filter(x=>x.menu),source:'NEIS'});
 }
 return json({ok:false,error:'요청 유형 오류'},400);
}
export default {async fetch(request,env,ctx){
 const u=new URL(request.url);
 if(!u.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(request.method!=='GET')return json({ok:false,error:'GET 요청만 지원합니다.'},405);
 const route=u.pathname.split('/').pop();
 if(!['neis','school-calendar','school-meals'].includes(route))return json({ok:false,error:'요청 경로 오류'},404);
 if(route==='school-calendar')u.searchParams.set('action','calendar');
 if(route==='school-meals')u.searchParams.set('action','meals');
 // Reject unknown legacy school scraping paths rather than trusting user-controlled URLs.
 if(route!=='neis' && u.searchParams.get('school')!=='bongseo-m')return json({ok:false,error:'이 학교는 검색 결과에서 다시 선택해 주세요.'},400);
 const cacheUrl=new URL(u);cacheUrl.searchParams.delete('path');
 const cacheKey=new Request(cacheUrl.toString(),{method:'GET'});
 const cached=await caches.default.match(cacheKey);if(cached)return cached;
 try{
   const result=await execute(u,env);
   if(result.ok){const ttl=u.searchParams.get('action')==='search'?21600:3600;
     const headers=new Headers(result.headers);headers.set('cache-control',`public, max-age=0, s-maxage=${ttl}`);
     const response=new Response(result.body,{status:result.status,headers});ctx.waitUntil(caches.default.put(cacheKey,response.clone()));return response;
   }
   return result;
 }catch(e){return json({ok:false,error:trim(e.message).slice(0,160)||'서버 오류'},502)}
}};
