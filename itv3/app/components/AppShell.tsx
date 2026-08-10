"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
const menus=[
 ["/","▣","대시보드"],["/customers","♙","고객관리"],["/assets","▰","자산관리"],["/software","▤","소프트웨어관리"],["/sales","↗","영업관리"],["/schedule","▦","일정관리"],["/reports","▥","보고서"],["/chat","◌","챗봇상담"],["/settings","⚙","설정"]
];
export default function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 return <div className="app"><aside className="sidebar"><div className="logo"><span>▣</span><b>퍼스트전산 IT</b></div><nav>{menus.map(([href,icon,label])=><Link key={href} href={href} className={path===href?"active":""}><i>{icon}</i><span>{label}</span></Link>)}</nav></aside><main className="content">{children}</main></div>
}
