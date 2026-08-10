import "./globals.css";
import AppShell from "./components/AppShell";
export const metadata={title:"퍼스트전산 ERP",description:"소프트웨어 자산 및 영업관리"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body><AppShell>{children}</AppShell></body></html>}
