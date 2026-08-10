import {getSheetData,Row} from "@/lib/sheet-api";
function n(v?:string){return Number(String(v||"").replace(/[₩원,\s]/g,""))||0}
function money(v:number){return new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(v)}
function name(id:string,cs:Row[]){return cs.find(c=>c["고객사ID"]===id)?.["고객사명"]||id}
function Badge({v}:{v:string}){const danger=["확인필요","만료","비정품","비정품확인","비정품의심"].includes(v);const ok=["정품확인","정품매칭","계약","완료"].includes(v);return <span className={`badge ${danger?"danger":ok?"success":"neutral"}`}>{v||"-"}</span>}
function Kpi({t,v,c}:{t:string,v:string,c:string}){return <article className={`kpi ${c}`}><span>{t}</span><strong>{v}</strong></article>}
export default async function Page(){
 const d=await getSheetData();
 const renewal=d.softwareAssets.filter(x=>n(x["D-DAY"])<=60).sort((a,b)=>n(a["D-DAY"])-n(b["D-DAY"]));
 const review=d.discoveries.filter(x=>["확인필요","비정품의심","만료"].includes(x["확인상태"]));
 const opp=d.opportunities.filter(x=>!["계약","실패"].includes(x["진행상태"]));
 const revenue=opp.reduce((s,x)=>s+n(x["예상금액"]),0);
 return <main className="page">
  <header><div><p className="eyebrow">FIRST ERP</p><h1>퍼스트전산 SW 영업 대시보드</h1><p className="muted">구글시트 기준 영업·갱신 현황</p></div><div className="updated">최근 조회<strong>{d.updatedAt}</strong></div></header>
  <section className="kpis"><Kpi t="총 고객사" v={`${d.customers.length}개`} c="blue"/><Kpi t="SW 자산" v={`${d.softwareAssets.length}건`} c="purple"/><Kpi t="확인필요" v={`${review.length}건`} c="red"/><Kpi t="진행 영업기회" v={`${opp.length}건`} c="orange"/><Kpi t="예상 매출" v={money(revenue)} c="green"/></section>
  <section className="grid">
   <article className="card wide"><div className="cardHead"><div><h2>갱신 예정 고객</h2><p>D-60 이하 계약</p></div><b>{renewal.length}건</b></div><div className="table"><table><thead><tr><th>고객사</th><th>제품</th><th>플랜</th><th>종료일</th><th>D-Day</th><th>상태</th></tr></thead><tbody>{renewal.map(x=><tr key={x["SW자산번호"]}><td>{name(x["고객사ID"],d.customers)}</td><td>{x["제품명"]}</td><td>{x["플랜"]||"-"}</td><td>{x["종료일"]||"-"}</td><td className={n(x["D-DAY"])<=0?"dangerText":""}>{x["D-DAY"]||"-"}</td><td><Badge v={x["라이선스상태"]}/></td></tr>)}</tbody></table></div></article>
   <List title="확인필요 프로그램" rows={review.map(x=>({a:x["프로그램명"],b:`${name(x["고객사ID"],d.customers)} · ${x["PC명"]}`,c:x["확인상태"]}))}/>
   <List title="영업기회" rows={opp.map(x=>({a:x["기회유형"],b:`${name(x["고객사ID"],d.customers)} · ${money(n(x["예상금액"]))}`,c:x["진행상태"]}))}/>
   <List title="예정 일정" rows={d.schedules.map(x=>({a:x["일정유형"],b:name(x["고객사ID"],d.customers),c:`${x["일정일"]} · ${x["담당자"]}`}))}/>
  </section>
 </main>
}
function List({title,rows}:{title:string;rows:{a:string;b:string;c:string}[]}){return <article className="card"><div className="cardHead"><div><h2>{title}</h2><p>{rows.length}건</p></div></div><div className="stack">{rows.map((x,i)=><div className="item" key={i}><div><strong>{x.a}</strong><p>{x.b}</p></div><Badge v={x.c}/></div>)}</div></article>}
