import { getSheetData, Row } from "@/lib/sheet-api";

// 캐시를 완전히 끄고 매 요청마다 새 데이터를 가져오도록 설정
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Qy08PThMptm_lq-4g1Xfvh772A4e-x7f_I_J8_1eLro/edit";

// 숫자로 변환하는 도우미 (통화/퍼센트 문자열 및 공백 제거)
const num = (v?: string | number) => Number(String(v || "").replace(/[₩원,%\s]/g, "")) || 0;

// 원화 포맷팅 (원 단위)
const won = (v: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(v);

// 고객사ID -> 고객사명 변환 (GAS API의 '고객사' 시트 구조 반영)
const cname = (id: string, cs: Row[]) => cs.find(c => String(c["고객사ID"]).trim() === String(id).trim())?.["고객사명"] || id || "-";

// D-DAY 정수 추출 파서 (안전한 예외 처리)
const parseDday = (v?: string | number): number => {
  if (v === undefined || v === null || v === "") return NaN;
  const str = String(v).trim();
  const match = str.match(/-?\d+/);
  return match ? parseInt(match[0], 10) : NaN;
};

// 영구 라이선스 여부 확인
const isPerpetual = (x: Row) => {
  const end = String(x["종료일"] || "").trim();
  const state = String(x["라이선스상태"] || "").trim();
  return end.includes("영구") || state.includes("영구");
};

/**
 * [가드레일 필터 로직]
 * 1. 종료일에 '영구'가 포함되어 있거나 비어있는 항목 제외
 * 2. 라이선스 상태가 '제외', '종료', '만료'인 항목 제외
 * 3. D-DAY 파싱 불가 및 음수(이미 지난 만료건) 제외
 */
const isExcluded = (x: Row) => {
  const end = String(x["종료일"] || "").trim();
  const st = String(x["라이선스상태"] || "").trim();
  const dday = parseDday(x["D-DAY"]);

  return (
    isPerpetual(x) ||
    end === "-" ||
    end === "" ||
    ["제외", "종료", "만료"].some(k => st.includes(k)) ||
    isNaN(dday) ||
    dday < 0
  );
};

function Pill({ v }: { v: string }) {
  const val = String(v || "").trim();
  const d = ["확인필요", "만료", "비정품확인", "비정품의심"].includes(val);
  const s = ["정품확인", "정품매칭", "계약", "완료", "계약중"].includes(val);
  const w = ["진행중", "협상단계", "제안완료", "갱신예정"].includes(val);
  return <span className={`pill ${d ? "danger" : s ? "success" : w ? "warning" : "neutral"}`}>{val || "-"}</span>;
}

function Kpi({ icon, title, value, sub, tone }: { icon: string; title: string; value: string; sub: string; tone: string }) {
  return (
    <article className="kpi">
      <div className={`kicon ${tone}`}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </article>
  );
}

function Title({ t, u }: { t: string; u?: string }) {
  return (
    <div className="ptitle">
      <h2>{t}</h2>
      {u && <span>{u}</span>}
    </div>
  );
}

export default async function Page() {
  // GAS API (doGet) 호환 데이터 수집
  const d = await getSheetData();

  const customers = d.customers || [];
  const softwareAssets = d.softwareAssets || [];
  const opportunities = d.opportunities || [];

  // 1. 영업기회 필터링 (진행 중인 건만)
  const opp = opportunities.filter(x => !["계약", "실패", "종료"].includes(String(x["진행상태"] || "").trim()));
  const revenue = opp.reduce((s, x) => s + num(x["예상금액"]), 0);

  // 2. 전체 영구 라이선스 수 계산
  const perpetualCount = softwareAssets.filter(isPerpetual).length;

  // 3. 갱신 예정 리스트 필터링 (D-DAY 0~60일 이내)
  const renewal = softwareAssets
    .filter(x => {
      if (isExcluded(x)) return false;
      const dday = parseDday(x["D-DAY"]);
      return dday >= 0 && dday <= 60;
    })
    .sort((a, b) => {
      const ddayA = parseDday(a["D-DAY"]);
      const ddayB = parseDday(b["D-DAY"]);
      return ddayA - ddayB;
    });

  // 차트 데이터 구성 (D-7, D-30, D-60)
  const labs = ["D-7", "D-30", "D-60"];
  const counts = [
    renewal.filter(x => parseDday(x["D-DAY"]) <= 7).length,
    renewal.filter(x => parseDday(x["D-DAY"]) > 7 && parseDday(x["D-DAY"]) <= 30).length,
    renewal.filter(x => parseDday(x["D-DAY"]) > 30 && parseDday(x["D-DAY"]) <= 60).length,
  ];
  const max = Math.max(...counts, 1);

  // 소프트웨어 상태 현황 차트 데이터
  const stats = ["정품확인", "확인필요", "만료", "비정품확인", "미도입"];
  const colors = ["#2f80ed", "#f5a623", "#ff5353", "#a8666b", "#a9b1bd"];
  const sc = stats.map(s => softwareAssets.filter(x => String(x["라이선스상태"] || "").trim() === s).length);
  const total = Math.max(sc.reduce((a, b) => a + b, 0), 1);

  let start = 0;
  const parts = sc.map((c, i) => {
    const end = start + (c / total) * 360;
    const p = `${colors[i]} ${start}deg ${end}deg`;
    start = end;
    return p;
  });

  // 영업기회 TOP 5 집계
  const group = new Map<string, number>();
  opportunities.forEach(x => {
    const k = x["기회유형"] || "기타";
    group.set(k, (group.get(k) || 0) + 1);
  });
  const top = [...group.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topmax = Math.max(...top.map(x => x[1]), 1);

  // 하단 폼용 보조 데이터 연동
  const asset = renewal[0] || softwareAssets[0] || {};
  const cid = asset["고객사ID"] || customers[0]?.["고객사ID"] || "-";
  const cassets = softwareAssets.filter(x => String(x["고객사ID"]).trim() === String(cid).trim());
  const sel = opp.find(x => String(x["고객사ID"]).trim() === String(cid).trim()) || opp[0] || {};

  return (
    <main className="shell">
      {/* 좌측 메뉴 바 */}
      <aside className="sidebar">
        <div className="brand">
          <i className="bicon">▣</i>
          <span>퍼스트전산 IT</span>
        </div>
        <nav className="smenu">
          <a className="active"><i className="icon">▣</i> 대시보드</a>
          <a><i className="icon">♟</i> 고객관리</a>
          <a><i className="icon">▰</i> 자산관리</a>
          <a><i className="icon">▦</i> 소프트웨어관리</a>
          <a><i className="icon">↗</i> 영업관리</a>
          <a><i className="icon">🗓</i> 일정관리</a>
          <a><i className="icon">📊</i> 보고서</a>
          <a><i className="icon">💬</i> 챗봇상담</a>
          <a><i className="icon">⚙</i> 설정</a>
        </nav>
      </aside>

      {/* 우측 메인 영역 */}
      <section className="dash">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>FIRST IT</p>
            <h1 style={{ margin: "2px 0 0 0" }}>대시보드</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="updated">
              최근 동기화<strong>{d.updatedAt || "-"}</strong>
            </div>
            <a
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#0f9d58",
                color: "#ffffff",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "background-color 0.2s"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/>
              </svg>
              구글 시트 열기 ↗
            </a>
          </div>
        </header>

        {/* 상단 KPI 지표 카드리스트 */}
        <section className="kgrid">
          <Kpi icon="♣" title="총 고객사" value={`${customers.length}`} sub="전체 관리 고객" tone="blue" />
          <Kpi icon="◆" title="소프트웨어 자산" value={`${softwareAssets.length}`} sub="등록 자산 현황" tone="purple" />
          <Kpi icon="▦" title="갱신 예정 (D-60)" value={`${renewal.length}`} sub="60일 이내 만료" tone="orange" />
          <Kpi icon="∞" title="영구 라이선스" value={`${perpetualCount}`} sub="갱신 불필요" tone="purple" />
          <Kpi icon="↗" title="진행 영업기회" value={`${opp.length}`} sub="진행 중 기회" tone="green" />
          <Kpi icon="●" title="예상 매출액" value={won(revenue)} sub="진행 기회 합계" tone="mint" />
        </section>

        {/* 시각화 차트 패널 */}
        <section className="agrid">
          <article className="panel chart">
            <Title t="갱신 예정 현황" u="(단위: 건)" />
            <div className="bars">
              {labs.map((l, i) => (
                <div className="bcol" key={l}>
                  <b>{counts[i]}</b>
                  <div className="track">
                    <i style={{ height: `${Math.max((counts[i] / max) * 100, 4)}%` }} />
                  </div>
                  <small>{l}</small>
                </div>
              ))}
            </div>
          </article>
          <article className="panel chart">
            <Title t="소프트웨어 상태 현황" u="(단위: 건)" />
            <div className="donutwrap">
              <div className="donut" style={{ background: `conic-gradient(${parts.join(",")})` }}>
                <div>
                  <b>{sc.reduce((a, b) => a + b, 0)}</b>
                  <span>전체</span>
                </div>
              </div>
              <div className="legend">
                {stats.map((s, i) => (
                  <p key={s}>
                    <i style={{ background: colors[i] }} />
                    <span>{s}</span>
                    <b>{sc[i]}</b>
                  </p>
                ))}
              </div>
            </div>
          </article>
          <article className="panel chart">
            <Title t="영업기회 TOP 5" u="(단위: 건)" />
            <div className="ranks">
              {top.map(([n, c], i) => (
                <div key={n}>
                  <b>{i + 1}</b>
                  <span>{n}</span>
                  <p>
                    <i style={{ width: `${(c / topmax) * 100}%` }} />
                  </p>
                  <strong>{c}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* 갱신 예정 상세 테이블 (D-60 이내만 필터링) */}
        <article className="panel renewal">
          <Title t="곧 갱신 예정 고객 (D-60 이내)" />
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>고객사</th>
                  <th>제품명</th>
                  <th>플랜</th>
                  <th>수량</th>
                  <th>종료일</th>
                  <th>D-Day</th>
                  <th>월 금액</th>
                  <th>담당자</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {renewal.map(x => (
                  <tr key={x["system_id"] || x["SW자산번호"]}>
                    <td>{cname(x["고객사ID"], customers)}</td>
                    <td>{x["제품명"]}</td>
                    <td>{x["플랜"] || "-"}</td>
                    <td>{x["수량"] || "-"}</td>
                    <td>{x["종료일"] || "-"}</td>
                    <td className={parseDday(x["D-DAY"]) <= 30 ? "redtext" : ""}>
                      {x["D-DAY"] || "-"}
                    </td>
                    <td>{won(num(x["월금액"]))}</td>
                    <td>{x["담당자"] || "-"}</td>
                    <td>
                      <Pill v={x["라이선스상태"]} />
                    </td>
                  </tr>
                ))}
                {renewal.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#888" }}>
                      60일 이내 갱신 대상 소프트웨어가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* 상세 업무 정보 레이아웃 */}
        <section className="work">
          <article className="panel workcard">
            <h3>소프트웨어 자산 정보</h3>
            <div className="form">
              <label>
                고객사
                <input value={cname(cid, customers)} readOnly />
              </label>
              <label>
                담당자
                <input value={asset["담당자"] || "-"} readOnly />
              </label>
              <label>
                제품명
                <input value={asset["제품명"] || "-"} readOnly />
              </label>
              <label>
                플랜
                <input value={asset["플랜"] || "-"} readOnly />
              </label>
              <label>
                시작일
                <input value={asset["시작일"] || "-"} readOnly />
              </label>
              <label>
                종료일
                <input value={asset["종료일"] || "-"} readOnly />
              </label>
              <label>
                월 금액
                <input value={won(num(asset["월금액"]))} readOnly />
              </label>
              <label>
                상태
                <input value={asset["라이선스상태"] || "-"} readOnly />
              </label>
            </div>
            <small>※ 조회 전용 화면입니다. 편집은 구글 시트에서 수행하세요.</small>
          </article>

          <article className="panel workcard middle">
            <h3>고객사별 라이선스 보유 현황 ({cid})</h3>
            <div className="summary">
              <span>
                자산번호 <b>{asset["SW자산번호"] || "-"}</b>
              </span>
              <span>
                고객사명 <b>{cname(cid, customers)}</b>
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>제품명</th>
                  <th>상태</th>
                  <th>수량</th>
                  <th>종료일</th>
                  <th>플랜</th>
                </tr>
              </thead>
              <tbody>
                {cassets.map(x => (
                  <tr key={x["system_id"] || x["SW자산번호"]}>
                    <td>{x["제품명"]}</td>
                    <td>
                      <Pill v={x["라이선스상태"]} />
                    </td>
                    <td>{x["수량"] || "-"}</td>
                    <td>{x["종료일"] || "-"}</td>
                    <td>{x["플랜"] || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="panel workcard">
            <h3>연관 영업기회 정보</h3>
            <div className="form one">
              <label>
                기회 유형
                <input value={sel["기회유형"] || "-"} readOnly />
              </label>
              <label>
                우선순위
                <input value={sel["우선순위"] || "-"} readOnly />
              </label>
              <label>
                관련 고객
                <input value={cname(sel["고객사ID"], customers)} readOnly />
              </label>
              <label>
                예상 금액
                <input value={won(num(sel["예상금액"]))} readOnly />
              </label>
              <label>
                메모
                <textarea value={sel["메모"] || "-"} readOnly />
              </label>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
