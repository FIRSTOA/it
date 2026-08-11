import { getSheetData, Row } from "@/lib/sheet-api";

export const dynamic = "force-dynamic";

const num = (v?: string) => Number(String(v || "").replace(/[₩원,%\s,]/g, "")) || 0;
const won = (v: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(v);
const cname = (id: string, cs: Row[]) => cs.find(c => c["고객사ID"] === id)?.["고객사명"] || id || "-";
const isPerpetual = (x: Row) => String(x["종료일"] || "").trim().includes("영구");

// [수정 1] 통합 제외 조건 가드레일 함수
const isExcluded = (x: Row) => {
  const end = String(x["종료일"] || "").trim();
  const st = String(x["라이선스상태"] || "").trim();
  const ddayRaw = String(x["D-DAY"] || "").trim();
  const dday = parseInt(ddayRaw, 10);

  return (
    // 1. 종료일 영구 / 미입력 / 빈값
    end.includes("영구") || end === "-" || end === "" ||
    // 2. 만료/제외 상태
    ["제외", "종료", "만료"].some(k => st.includes(k)) ||
    // 3. D-DAY 없음
    ddayRaw === "-" || ddayRaw === "" ||
    // 4. 숫자가 아니거나 음수(D-DAY 만료건)
    isNaN(dday) || dday < 0
  );
};

function Pill({ v }: { v: string }) { const d = ["확인필요", "만료", "비정품확인", "비정품의심"].includes(v), s = ["정품확인", "정품매칭", "계약", "완료", "계약중"].includes(v), w = ["진행중", "협상단계", "제안완료", "갱신예정"].includes(v); return <span className={`pill ${d ? "danger" : s ? "success" : w ? "warning" : "neutral"}`}>{v || "-"}</span> }
function Kpi({ icon, title, value, sub, tone }: { icon: string, title: string, value: string, sub: string, tone: string }) { return <article className="kpi"><div className={`kicon ${tone}`}>{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div></article> }
function Title({ t, u }: { t: string, u?: string }) { return <div className="ptitle"><h2>{t}</h2>{u && <span>{u}</span>}</div> }

export default async function Page() {
  const d = await getSheetData();

  const opp = d.opportunities.filter(x => !["계약", "실패"].includes(x["진행상태"]));
  const revenue = opp.reduce((s, x) => s + num(x["예상금액"]), 0);
  const perpetualCount = d.softwareAssets.filter(isPerpetual).length;

  // [수정 2] 갱신 예정 목록 (isExcluded 가드레일 활용 + 90일 이내)
  const renewal = d.softwareAssets
    .filter(x => {
      // 1. 제외 조건(영구, 음수 D-DAY, 빈값 등) 통과 여부 검증
      if (isExcluded(x)) return false;

      // 2. 90일 초과 건 제외
      const dday = parseInt(String(x["D-DAY"]).trim(), 10);
      return dday <= 90;
    })
    .sort((a, b) => {
      return parseInt(String(a["D-DAY"] || "9999"), 10) - parseInt(String(b["D-DAY"] || "9999"), 10);
    });

  // 이하 기존 차트 및 JSX 반환 로직 동일...
