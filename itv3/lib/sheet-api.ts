export type Row=Record<string,string>;
export type SheetData={ok:boolean;updatedAt:string;customers:Row[];softwareAssets:Row[];discoveries:Row[];opportunities:Row[];schedules:Row[]};
export async function getSheetData():Promise<SheetData>{
 const apiUrl=process.env.SHEET_API_URL,apiKey=process.env.SHEET_API_KEY;
 if(!apiUrl||!apiKey)return {ok:true,updatedAt:"환경변수 설정 필요",customers:[],softwareAssets:[],discoveries:[],opportunities:[],schedules:[]};
 const url=new URL(apiUrl);url.searchParams.set("key",apiKey);
 const response=await fetch(url.toString(),{cache:"no-store"});
 if(!response.ok)throw new Error(`구글시트 API 호출 실패: ${response.status}`);
 const data=await response.json() as SheetData;
 if(!data.ok)throw new Error("구글시트 API가 오류를 반환했습니다.");return data;
}
