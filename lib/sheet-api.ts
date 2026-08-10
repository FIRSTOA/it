export type Row=Record<string,string>;
export type SheetData={ok:boolean;updatedAt:string;customers:Row[];softwareAssets:Row[];discoveries:Row[];opportunities:Row[];schedules:Row[]};
export async function getSheetData():Promise<SheetData>{
 const apiUrl=process.env.SHEET_API_URL,apiKey=process.env.SHEET_API_KEY;
 if(!apiUrl||!apiKey)throw new Error("SHEET_API_URL 또는 SHEET_API_KEY가 설정되지 않았습니다.");
 const url=new URL(apiUrl);url.searchParams.set("key",apiKey);
 const response=await fetch(url.toString(),{cache:"no-store"});
 if(!response.ok)throw new Error(`구글시트 API 호출 실패: ${response.status}`);
 const data=await response.json() as SheetData;
 if(!data.ok)throw new Error("구글시트 API가 오류를 반환했습니다.");return data;
}
