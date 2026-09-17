import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { ClipboardList, LogOut, PanelLeft } from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const { loading, user } = useAuth();
  useEffect(() => { localStorage.setItem("sidebar-width", String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#dbe4da] bg-white p-8 text-center shadow-sm">
        <ClipboardList className="mx-auto mb-4 h-8 w-8 text-[#316c48]" />
        <h1 className="text-2xl font-semibold text-[#1f3c2a]">Acesso da equipe</h1>
        <p className="mt-2 text-sm text-[#718073]">Entre para abrir a planilha de pacientes.</p>
        <Button onClick={() => startLogin()} className="mt-6 w-full bg-[#316c48] hover:bg-[#265a3a]">Entrar no painel</Button>
      </div>
    </div>
  );
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><LayoutContent>{children}</LayoutContent></SidebarProvider>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  return <>
    <Sidebar collapsible="icon" className="border-r border-[#dbe4da] bg-[#fafcf9]">
      <SidebarHeader className="h-16 border-b border-[#e7eee6]">
        <div className="flex items-center gap-3 px-2"><button onClick={toggleSidebar} aria-label="Alternar menu" className="rounded-lg p-2 text-[#316c48] hover:bg-[#e7f1e8]"><PanelLeft className="h-4 w-4" /></button><div className="group-data-[collapsible=icon]:hidden"><p className="font-semibold text-[#1f3c2a]">Planilha CRC</p><p className="text-[10px] uppercase tracking-widest text-[#78917c]">Primeira consulta</p></div></div>
      </SidebarHeader>
      <SidebarContent className="pt-4"><SidebarMenu className="px-2"><SidebarMenuItem><SidebarMenuButton isActive tooltip="Pacientes" className="h-10 rounded-lg text-[#316c48] data-[active=true]:bg-[#e2f0e3]"><ClipboardList className="h-4 w-4" /><span>Pacientes</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarContent>
      <SidebarFooter className="border-t border-[#e7eee6] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-[#e7f1e8] group-data-[collapsible=icon]:justify-center"><Avatar className="h-8 w-8 border border-[#cfe0d0]"><AvatarFallback className="bg-[#e2f0e3] text-xs font-semibold text-[#316c48]">{user?.name?.charAt(0).toUpperCase() ?? "C"}</AvatarFallback></Avatar><span className="truncate text-xs text-[#496450] group-data-[collapsible=icon]:hidden">{user?.name || "Equipe"}</span></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset><div className="md:hidden sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-white px-3"><SidebarTrigger /><span className="text-sm font-semibold text-[#31543c]">Pacientes</span></div><main>{children}</main></SidebarInset>
  </>;
}
