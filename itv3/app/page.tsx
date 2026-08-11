import {getSheetData,Row} from "@/lib/sheet-api";

export const dynamic = "force-dynamic";

const num=(v?:string)=>Number(String(v||"").replace(/[₩원,%\s,]/g,""))||0;
const won=(v:number)=>new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(v);
const cname=(id:string,cs:Row[])=>cs.find(c=>c["고객사ID"]===id)?.["고객사명"]||id||"-";
const isPerpetual=(x:Row)=>String(x["종료일"]||"").trim().includes("영구");

// 영구 라이선스, 빈 종료일, 만료건, 음수 D-DAY 제외
const isExcluded = (x: Row) => {

  const end = String(x["종료일"] || "").trim();
  const st = String(x["라이선스상태"] || "").trim();
  const dday = Number(String(x["D-DAY"] || "").trim());

  return (
    end.includes("영구") ||
    end === "-" ||
    end === "" ||

    // 상태 제외
    ["제외","종료","만료"].some(k => st.includes(k)) ||

    // D-DAY 없음
    String(x["D-DAY"] || "").trim() === "-" ||
    String(x["D-DAY"] || "").trim() === "" ||

    // 음수 D-DAY 제외
    (!isNaN(dday) && dday < 0)
  );
};

function Pill({v}:{v:string}){const d=["확인필요","만료","비정품확인","비정품의심"].includes(v),s=["정품확인","정품매칭","계약","완료","계약중"].includes(v),w=["진행중","협상단계","제안완료","갱신예정"].includes(v);return <span className={`pill ${d?"danger":s?"success":w?"warning":"neutral"}`}>{v||"-"}</span>}
function Kpi({icon,title,value,sub,tone}:{icon:string,title:string,value:string,sub:string,tone:string}){return <article className="kpi"><div className={`kicon ${tone}`}>{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div></article>}
function Title({t,u}:{t:string,u?:string}){return <div className="ptitle"><h2>{t}</h2>{u&&<span>{u}</span>}</div>}

export default async function Page(){
  const d=await getSheetData();
  const opp=d.opportunities.filter(x=>!["계약","실패"].includes(x["진행상태"]));
  const revenue=opp.reduce((s,x)=>s+num(x["예상금액"]),0);
  const perpetualCount=d.softwareAssets.filter(isPerpetual).length;

 const renewal = d.softwareAssets
  .filter(x =>
    !isExcluded(x) &&
    num(x["D-DAY"]) >= 0 &&
    num(x["D-DAY"]) <= 90
  )
  .sort(
    (a,b)=>
      num(a["D-DAY"]) -
      num(b["D-DAY"])
  );

  const bucket=(n:number)=>n<=0?"만료":n<=7?"D-7":n<=30?"D-30":n<=60?"D-60":"D-90";
  const labs=["D-90","D-60","D-30","D-7","만료"], counts=labs.map(l=>renewal.filter(x=>bucket(num(x["D-DAY"]))===l).length), max=Math.max(...counts,1);
  const stats=["정품확인","확인필요","만료","비정품확인","미도입"], colors=["#2f80ed","#f5a623","#ff5353","#a8666b","#a9b1bd"], sc=stats.map(s=>d.softwareAssets.filter(x=>x["라이선스상태"]===s).length), total=Math.max(sc.reduce((a,b)=>a+b,0),1);
  let start=0;const parts=sc.map((c,i)=>{const end=start+c/total*360,p=`${colors[i]} ${start}deg ${end}deg`;start=end;return p});
  const group=new Map<string,number>();d.opportunities.forEach(x=>{const k=x["기회유형"]||"기타";group.set(k,(group.get(k)||0)+1)});const top=[...group.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),topmax=Math.max(...top.map(x=>x[1]),1);
  const asset=d.softwareAssets[0]||{},cid=asset["고객사ID"]||d.customers[0]?.["고객사ID"]||"-",cassets=d.softwareAssets.filter(x=>x["고객사ID"]===cid),sel=opp[0]||{};

  return (
    <main className="shell">
      <aside><b>F</b><nav><i className="active">▦</i><i>◉</i><i>▣</i><i>⚙</i></nav></aside>
      <section className="dash">
        <header><div><p>FIRST IT</p><h1>대시보드</h1></div><div className="updated">최근 조회<strong>{d.updatedAt}</strong></div></header>
        <section className="kgrid">
          <Kpi icon="♣" title="총 고객사" value={`${d.customers.length}`} sub="전체 관리 고객" tone="blue"/>
          <Kpi icon="◆" title="소프트웨어 자산" value={`${d.softwareAssets.length}`} sub="등록 자산 현황" tone="purple"/>
          <Kpi icon="▦" title="갱신 예정 (D-60)" value={`${renewal.filter(x=>num(x["D-DAY"])<=60).length}`} sub="60일 이내" tone="orange"/>
          <Kpi icon="∞" title="영구 라이선스" value={`${perpetualCount}`} sub="갱신 불필요" tone="purple"/>
          <Kpi icon="↗" title="영업기회" value={`${opp.length}`} sub="진행 중 기회" tone="green"/>
          <Kpi icon="●" title="월 예상 매출" value={won(revenue)} sub="진행 기회 합계" tone="mint"/>
        </section>
        <section className="agrid">
          <article className="panel chart"><Title t="갱신 예정 현황" u="(단위: 건)"/><div className="bars">{labs.map((l,i)=><div className="bcol" key={l}><b>{counts[i]}</b><div className="track"><i style={{height:`${Math.max(counts[i]/max*100,4)}%`}}/></div><small>{l}</small></div>)}</div></article>
          <article className="panel chart"><Title t="소프트웨어 상태 현황" u="(단위: 건)"/><div className="donutwrap"><div className="donut" style={{background:`conic-gradient(${parts.join(",")})`}}><div><b>{sc.reduce((a,b)=>a+b,0)}</b><span>전체</span></div></div><div className="legend">{stats.map((s,i)=><p key={s}><i style={{background:colors[i]}}/><span>{s}</span><b>{sc[i]}</b></p>)}</div></div></article>
          <article className="panel chart"><Title t="영업기회 TOP 5" u="(단위: 건)"/><div className="ranks">{top.map(([n,c],i)=><div key={n}><b>{i+1}</b><span>{n}</span><p><i style={{width:`${c/topmax*100}%`}}/></p><strong>{c}</strong></div>)}</div></article>
        </section>
        <article className="panel renewal">
          <Title t="곧 갱신 예정 고객"/>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>고객사</th><th>제품명</th><th>플랜</th><th>수량</th><th>종료일</th><th>D-Day</th><th>예상 금액</th><th>담당자</th><th>상태</th>
                </tr>
              </thead>
              <tbody>
                {renewal.slice(0,8).map(x=>(
                  <tr key={x["SW자산번호"]}>
                    <td>{cname(x["고객사ID"],d.customers)}</td>
                    <td>{x["제품명"]}</td>
                    <td>{x["플랜"]||"-"}</td>
                    <td>{x["수량"]||"-"}</td>
                    <td>{x["종료일"]||"-"}</td>
                    <td className={num(x["D-DAY"])<=30?"redtext":""}>{x["D-DAY"]||"-"}</td>
                    <td>{won(num(x["월금액"]))}</td>
                    <td>{x["담당자"]||"-"}</td>
                    <td><Pill v={x["라이선스상태"]}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <section className="work">
          <article className="panel workcard">
            <h3>소프트웨어 자산 입력/수정</h3>
            <div className="form">
              <label>고객사<input value={cname(cid,d.customers)} readOnly/></label>
              <label>담당자<input value={asset["담당자"]||"-"} readOnly/></label>
              <label>제품명<input value={asset["제품명"]||"-"} readOnly/></label>
              <label>플랜<input value={asset["플랜"]||"-"} readOnly/></label>
              <label>시작일<input value={asset["시작일"]||"-"} readOnly/></label>
              <label>종료일<input value={asset["종료일"]||"-"} readOnly/></label>
              <label>월 금액<input value={won(num(asset["월금액"]))} readOnly/></label>
              <label>상태<input value={asset["라이선스상태"]||"-"} readOnly/></label>
            </div>
            <small>조회용 화면이며 수정은 구글시트에서 진행합니다.</small>
          </article>
          <article className="panel workcard middle">
            <h3>고객사별 소프트웨어 현황 ({cid})</h3>
            <div className="summary">
              <span>자산번호 <b>{asset["SW자산번호"]||"-"}</b></span>
              <span>고객사 <b>{cname(cid,d.customers)}</b></span>
            </div>
            <table>
              <thead>
                <tr><th>제품명</th><th>상태</th><th>수량</th><th>만료일</th><th>비고</th></tr>
              </thead>
              <tbody>
                {cassets.map(x=>(
                  <tr key={x["SW자산번호"]}>
                    <td>{x["제품명"]}</td>
                    <td><Pill v={x["라이선스상태"]}/></td>
                    <td>{x["수량"]||"-"}</td>
                    <td>{x["종료일"]||"-"}</td>
                    <td>{x["플랜"]||"-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          <article className="panel workcard">
            <h3>영업기회 정보</h3>
            <div className="form one">
              <label>기회 유형<input value={sel["기회유형"]||"-"} readOnly/></label>
              <label>우선순위<input value={sel["우선순위"]||"-"} readOnly/></label>
              <label>관련 고객<input value={cname(sel["고객사ID"],d.customers)} readOnly/></label>
              <label>예상 금액<input value={won(num(sel["예상금액"]))} readOnly/></label>
              <label>메모<textarea value={sel["메모"]||"-"} readOnly/></label>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
