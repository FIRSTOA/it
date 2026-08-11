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
      ok: false,
      updatedAt: "환경변수 미설정 (SHEET_API_URL / SHEET_API_KEY)",
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
    
    // [가드레일 1] Next.js Data Cache 및 CDN 강제 우회를 위한 캐시 버스터 타임스탬프 추가
    url.searchParams.set("_t", Date.now().toString());

    const response = await fetch(url.toString(), {
      // [가드레일 2] Next.js App Router 서버 캐시 완전 차단
      cache: "no-store",
      next: { revalidate: 0 },
      // [가드레일 3] HTTP 헤더 수준 캐시 차단
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      // [가드레일 4] Google Apps Script의 302 리다이렉트를 자동 추적하도록 설정
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`구글시트 API 호출 실패 (HTTP ${response.status})`);
    }

    const data = (await response.json()) as Partial<SheetData>;

    if (!data.ok) {
      throw new Error("구글시트 API 응답 상태가 ok: false 입니다.");
    }

    // [가드레일 5] 안전한 데이터 매핑 및 타입 방어 코드
    return {
      ok: true,
      updatedAt: data.updatedAt || new Date().toLocaleString("ko-KR"),
      customers: Array.isArray(data.customers) ? data.customers : [],
      softwareAssets: Array.isArray(data.softwareAssets) ? data.softwareAssets : [],
      discoveries: Array.isArray(data.discoveries) ? data.discoveries : [],
      opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
      schedules: Array.isArray(data.schedules) ? data.schedules : [],
    };
  } catch (error) {
    console.error("[Sheet API Error]:", error);
    
    // API 장애 발생 시 앱 전체 다운을 막기 위한 Fallback 구조
    return {
      ok: false,
      updatedAt: "데이터 로드 실패 (로그 확인 필요)",
      customers: [],
      softwareAssets: [],
      discoveries: [],
      opportunities: [],
      schedules: [],
    };
  }
}
