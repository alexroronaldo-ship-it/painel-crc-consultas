import { useAuth } from "@/_core/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { ClipboardCheck, LogOut, PanelLeft } from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const logoPath = "/manus-storage/alvo-pro-lab-logo_8a24766e.png";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const { loading, user } = useAuth();
  useEffect(() => { localStorage.setItem("sidebar-width", String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#f3f8fb] px-6"><div className="w-full max-w-sm rounded-2xl border border-[#d7e5ec] bg-white p-8 text-center shadow-sm"><img src={logoPath} alt="Alvo Pro Lab" className="mx-auto mb-6 h-24 w-auto object-contain" /><h1 className="text-2xl font-semibold text-[#174f6f]">Acesso da equipe</h1><p className="mt-2 text-sm text-[#6e7f88]">Entre para abrir a planilha de fechamentos.</p><Button onClick={() => startLogin()} className="mt-6 w-full bg-[#2e7da3] hover:bg-[#246989]">Entrar no painel</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><LayoutContent>{children}</LayoutContent></SidebarProvider>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  return <><Sidebar collapsible="icon" className="border-r border-[#d7e5ec] bg-[#f8fbfc]"><SidebarHeader className="h-20 border-b border-[#e3edf1]"><div className="flex h-full items-center gap-2 px-2"><button onClick={toggleSidebar} aria-label="Alternar menu" className="rounded-lg p-2 text-[#2e7da3] hover:bg-[#e5f1f6]"><PanelLeft className="h-4 w-4" /></button><img src={logoPath} alt="Alvo Pro Lab" className="h-12 w-32 object-contain group-data-[collapsible=icon]:hidden" /></div></SidebarHeader><SidebarContent className="pt-4"><SidebarMenu className="px-2"><SidebarMenuItem><SidebarMenuButton isActive tooltip="Fechamentos" className="h-10 rounded-lg text-[#2e7da3] data-[active=true]:bg-[#e5f1f6]"><ClipboardCheck className="h-4 w-4" /><span>Fechamentos</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarContent><SidebarFooter className="border-t border-[#e3edf1] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-[#e5f1f6] group-data-[collapsible=icon]:justify-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f1f6] text-[10px] font-bold text-[#2e7da3]">CRC</span><span className="truncate text-xs text-[#486a7b] group-data-[collapsible=icon]:hidden">Equipe CRC</span></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset><div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-[#d7e5ec] bg-white px-3 md:hidden"><SidebarTrigger /><img src={logoPath} alt="Alvo Pro Lab" className="h-8 w-auto object-contain" /></div><main>{children}</main></SidebarInset></>;
}
