import {getSheetData,Row} from "@/lib/sheet-api";

export const dynamic = "force-dynamic";

const num=(v?:string)=>Number(String(v||"").replace(/[₩원,%\s,]/g,""))||0;
const won=(v:number)=>new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(v);
const cname=(id:string,cs:Row[])=>cs.find(c=>c["고객사ID"]===id)?.["고객사명"]||id||"-";
@@ -20,7 +23,7 @@ export default async function Page(){
const group=new Map<string,number>();d.opportunities.forEach(x=>{const k=x["기회유형"]||"기타";group.set(k,(group.get(k)||0)+1)});const top=[...group.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),topmax=Math.max(...top.map(x=>x[1]),1);
const asset=d.softwareAssets[0]||{},cid=asset["고객사ID"]||d.customers[0]?.["고객사ID"]||"-",cassets=d.softwareAssets.filter(x=>x["고객사ID"]===cid),sel=opp[0]||{};
return <main className="shell"><aside><b>F</b><nav><i className="active">▦</i><i>◉</i><i>▣</i><i>⚙</i></nav></aside><section className="dash">
 <header><div><p>FIRST ERP</p><h1>대시보드</h1></div><div className="updated">최근 조회<strong>{d.updatedAt}</strong></div></header>
 <header><div><p>FIRST IT</p><h1>대시보드</h1></div><div className="updated">최근 조회<strong>{d.updatedAt}</strong></div></header>
<section className="kgrid"><Kpi icon="♣" title="총 고객사" value={`${d.customers.length}`} sub="전체 관리 고객" tone="blue"/><Kpi icon="◆" title="소프트웨어 자산" value={`${d.softwareAssets.length}`} sub="등록 자산 현황" tone="purple"/><Kpi icon="▦" title="갱신 예정 (D-60)" value={`${d.softwareAssets.filter(x=>!isExcluded(x)&&num(x["D-DAY"])<=60).length}`} sub="60일 이내" tone="orange"/><Kpi icon="∞" title="영구 라이선스" value={`${perpetualCount}`} sub="갱신 불필요" tone="purple"/><Kpi icon="↗" title="영업기회" value={`${opp.length}`} sub="진행 중 기회" tone="green"/><Kpi icon="●" title="월 예상 매출" value={won(revenue)} sub="진행 기회 합계" tone="mint"/></section>
<section className="agrid"><article className="panel chart"><Title t="갱신 예정 현황" u="(단위: 건)"/><div className="bars">{labs.map((l,i)=><div className="bcol" key={l}><b>{counts[i]}</b><div className="track"><i style={{height:`${Math.max(counts[i]/max*100,4)}%`}}/></div><small>{l}</small></div>)}</div></article>
<article className="panel chart"><Title t="소프트웨어 상태 현황" u="(단위: 건)"/><div className="donutwrap"><div className="donut" style={{background:`conic-gradient(${parts.join(",")})`}}><div><b>{sc.reduce((a,b)=>a+b,0)}</b><span>전체</span></div></div><div className="legend">{stats.map((s,i)=><p key={s}><i style={{background:colors[i]}}/><span>{s}</span><b>{sc[i]}</b></p>)}</div></div></article>
