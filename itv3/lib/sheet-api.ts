export type Row = Record<string, string>;

export type SheetData = {
  ok: boolean;
  updatedAt: string;
  customers: Row[];
  softwareAssets: Row[];
  discoveries: Row[];
  opportunities: Row[];
  schedules: Row[];
};

export async function getSheetData(): Promise<SheetData> {
  const apiUrl = process.env.SHEET_API_URL;
  const apiKey = process.env.SHEET_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      ok: true,
      updatedAt: "환경변수 설정 필요 (SHEET_API_URL / SHEET_API_KEY)",
      customers: [],
      softwareAssets: [],
      discoveries: [],
      opportunities: [],
      schedules: [],
    };
  }

  try {
    const url = new URL(apiUrl);
    url.searchParams.set("key", apiKey);
    
    // [가드레일] Vercel Edge / Next.js Data Cache 강제 우회를 위한 타임스탬프 파라미터 추가
    url.searchParams.set("_t", Date.now().toString());

    const response = await fetch(url.toString(), {
      // 1. Next.js App Router 전용 캐시 무효화 옵션
      cache: "no-store",
      next: { revalidate: 0 },
      // 2. HTTP 헤더 수준 캐시 방지
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`구글시트 API 호출 실패 (Status: ${response.status})`);
    }

    const data = (await response.json()) as SheetData;

    if (!data.ok) {
      throw new Error("구글시트 API 응답 상태가 ok: false 입니다.");
    }

    return {
      ok: data.ok ?? true,
      updatedAt: data.updatedAt || new Date().toLocaleString("ko-KR"),
      customers: Array.isArray(data.customers) ? data.customers : [],
      softwareAssets: Array.isArray(data.softwareAssets) ? data.softwareAssets : [],
      discoveries: Array.isArray(data.discoveries) ? data.discoveries : [],
      opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
      schedules: Array.isArray(data.schedules) ? data.schedules : [],
    };
  } catch (error) {
    console.error("[Sheet API Error]:", error);
    // API 에러 발생 시 앱 전체 붕괴(Crash)를 막기 위한 안전한 폴백(Fallback) 데이터 반환
    return {
      ok: false,
      updatedAt: "데이터 로드 실패",
      customers: [],
      softwareAssets: [],
      discoveries: [],
      opportunities: [],
      schedules: [],
    };
  }
}
