import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Campaign } from "../../../drizzle/schema";
import { calculateCampaignTotals, calculateCampaignWeeks } from "@/lib/campaign-metrics";
import { paginateItems } from "@/lib/pagination";
import { calculateWeeklyGoal } from "@/lib/weekly-sales";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarDays, Check, Loader2, Megaphone, Pencil, Plus, Target, Trash2, Merge } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const barColors = ["bg-[#2e7da3]", "bg-[#58b981]", "bg-[#d6a22c]", "bg-[#6a91b2]", "bg-[#65b9b3]", "bg-[#9476b5]"];

export default function Campaigns() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("37500");
  const [campaignPage, setCampaignPage] = useState(1);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [mergingCampaign, setMergingCampaign] = useState<Campaign | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const { user } = useAuth();
  const queryInput = useMemo(() => ({ month: selectedMonth }), [selectedMonth]);
  const utils = trpc.useUtils();
  const campaignsQuery = trpc.campaigns.list.useQuery();
  const usageQuery = trpc.campaigns.usage.useQuery();
  const usage = usageQuery.data ?? [];
  const closuresQuery = trpc.closures.list.useQuery(queryInput);
  const campaigns = campaignsQuery.data ?? [];
  const paginatedCampaigns = useMemo(() => paginateItems(campaigns, campaignPage), [campaigns, campaignPage]);
  const records = closuresQuery.data ?? [];
  const totals = calculateCampaignTotals(campaigns, records);
  const activeCampaignId = selectedCampaignId ? Number(selectedCampaignId) : totals[0]?.id;
  const activeCampaign = campaigns.find(campaign => campaign.id === activeCampaignId);
  const activeTotal = totals.find(campaign => campaign.id === activeCampaignId);
  const weeks = activeCampaignId ? calculateCampaignWeeks(activeCampaignId, records, selectedMonth) : [];
  const campaignRevenue = totals.reduce((sum, campaign) => sum + campaign.total, 0);
  const maxCampaignTotal = Math.max(...totals.map(campaign => campaign.total), 1);
  const periodLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`));

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: async () => {
      setSelectedMonth(startDate.slice(0, 7));
      setCampaignPage(1);
      await utils.campaigns.list.invalidate();
      setName("");
      setOrigin("");
      setStartDate("");
      setEndDate("");
      setWeeklyGoal("37500");
      toast.success("Campanha inscrita com sucesso", { description: "Uma nova coluna foi adicionada ao gráfico de campanhas." });
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.campaigns.update.useMutation({
    onSuccess: async () => { await utils.campaigns.list.invalidate(); setEditingCampaign(null); toast.success("Campanha corrigida com sucesso"); },
    onError: error => toast.error(error.message),
  });
  const deleteMutation = trpc.campaigns.deleteOne.useMutation({
    onSuccess: async () => { setSelectedCampaignId(""); setCampaignPage(1); await Promise.all([utils.campaigns.list.invalidate(), utils.campaigns.usage.invalidate()]); toast.success("Campanha sem vendas excluída"); },
    onError: error => toast.error(error.message),
  });
  const mergeMutation = trpc.campaigns.merge.useMutation({
    onSuccess: async () => { setMergingCampaign(null); setMergeTargetId(""); setSelectedCampaignId(""); setCampaignPage(1); await Promise.all([utils.campaigns.list.invalidate(), utils.campaigns.usage.invalidate(), utils.closures.list.invalidate()]); toast.success("Campanhas mescladas sem excluir fechamentos"); },
    onError: error => toast.error(error.message),
  });

  const saveEditedCampaign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCampaign) return;
    updateMutation.mutate({ id: editingCampaign.id, name: editingCampaign.name, origin: editingCampaign.origin ?? "", startDate: editingCampaign.startDate, endDate: editingCampaign.endDate || undefined, weeklyGoal: String(editingCampaign.weeklyGoal).replace(".", ",") });
  };
  const removeCampaign = (campaign: Campaign) => {
    if (usage.some(item => item.campaignId === campaign.id && item.count > 0)) return toast.error("A campanha possui fechamentos. Mescle-a com outra antes de excluí-la.");
    if (!window.confirm(`Excluir a campanha “${campaign.name}”? Esta ação não poderá ser desfeita.`)) return;
    const password = window.prompt("Digite a senha para excluir esta campanha:");
    if (password !== null) deleteMutation.mutate({ id: campaign.id, password });
  };
  const mergeCampaign = () => {
    if (!mergingCampaign || !mergeTargetId || mergingCampaign.id === Number(mergeTargetId)) return toast.error("Selecione outra campanha como destino");
    const target = campaigns.find(item => item.id === Number(mergeTargetId));
    const affected = usage.find(item => item.campaignId === mergingCampaign.id)?.count ?? 0;
    if (!window.confirm(`Mover ${affected} fechamento(s) de “${mergingCampaign.name}” para “${target?.name}” e excluir a campanha duplicada?`)) return;
    const password = window.prompt("Digite a senha para mesclar e retirar a campanha duplicada:");
    if (password !== null) mergeMutation.mutate({ sourceId: mergingCampaign.id, targetId: Number(mergeTargetId), password });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({ name, origin, startDate, endDate: endDate || undefined, weeklyGoal });
  };

  const isLoading = campaignsQuery.isLoading || closuresQuery.isLoading || usageQuery.isLoading;

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2e7da3]">Gestão comercial</p><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Campanhas</h1><p className="mt-1 text-sm text-[#6e7f88]">Inscreva campanhas e acompanhe quanto cada uma está trazendo.</p></div><div><label htmlFor="campaign-period" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Período dos resultados</label><Input id="campaign-period" type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} className="h-9 w-44 border-[#d7e5ec] bg-white" /></div></header>

    <div className="mb-4 flex items-center gap-2 text-xs text-[#6e7f88]"><CalendarDays className="h-4 w-4 text-[#b4a92f]" /><span>Resultados de <strong className="capitalize text-[#174f6f]">{periodLabel}</strong></span></div>

    <section className="mb-6 grid gap-4 sm:grid-cols-3"><SummaryCard label="Campanhas inscritas" value={String(campaigns.length)} icon={<Megaphone className="h-5 w-5 text-[#2e7da3]" />} detail="cada campanha cria uma nova coluna" /><SummaryCard label="Valor vindo de campanhas" value={currencyFormatter.format(campaignRevenue)} icon={<BarChart3 className="h-5 w-5 text-[#58a96b]" />} detail={`${records.filter(record => record.campaignId).length} fechamentos vinculados`} /><SummaryCard label="Melhor campanha no período" value={totals.length ? [...totals].sort((a, b) => b.total - a.total)[0].name : "Sem campanhas"} icon={<Target className="h-5 w-5 text-[#b4a92f]" />} detail={totals.length ? currencyFormatter.format(Math.max(...totals.map(campaign => campaign.total))) : "Cadastre a primeira campanha"} /></section>

    <Card className="mb-6 border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e5f1f6] text-[#2e7da3]"><Plus className="h-4 w-4" /></div><div><h2 className="font-semibold text-[#174f6f]">Inscrever nova campanha</h2><p className="text-xs text-[#7d8d95]">A coluna dessa campanha aparecerá automaticamente no gráfico abaixo.</p></div></div><form onSubmit={submit} className="grid gap-3 md:grid-cols-[1.3fr_1fr_0.75fr_0.75fr_0.8fr_auto]"><Field label="Nome da campanha"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Implante de setembro" required /></Field><Field label="Origem da campanha"><Input value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ex.: Instagram, Google, indicação" required /></Field><Field label="Início"><Input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required /></Field><Field label="Fim (opcional)"><Input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></Field><Field label="Meta semanal (R$)"><Input value={weeklyGoal} onChange={event => setWeeklyGoal(event.target.value.replace(/[^\d,]/g, ""))} inputMode="decimal" required /></Field><div className="flex items-end"><Button type="submit" disabled={createMutation.isPending} className="h-10 w-full bg-[#2e7da3] px-5 hover:bg-[#246989]">{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Inscrever</>}</Button></div></form></CardContent></Card>

    {isLoading ? <Card className="border-[#d8e5eb] bg-white"><CardContent className="flex items-center justify-center gap-2 py-20 text-[#6e7f88]"><Loader2 className="h-5 w-5 animate-spin" />Carregando campanhas...</CardContent></Card> : <>
      <Card className="mb-6 overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><CardHeader className="border-b border-[#edf2f4]"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2e7da3]">Comparativo dinâmico</p><CardTitle className="mt-1 text-xl text-[#174f6f]">Valor total trazido por campanha</CardTitle><p className="text-xs text-[#84949c]">Cada campanha inscrita abre uma nova coluna. Campanhas sem vendas aparecem com R$ 0.</p></CardHeader><CardContent className="p-5 sm:p-6">{totals.length === 0 ? <EmptyState /> : <div className="overflow-x-auto pb-2"><div className="grid h-72 grid-flow-col auto-cols-[minmax(150px,1fr)] items-end gap-4" style={{ minWidth: `${Math.max(100, totals.length * 175)}px` }}>{totals.map((campaign, index) => { const height = campaign.total > 0 ? Math.max(6, (campaign.total / maxCampaignTotal) * 100) : 2; return <button type="button" key={campaign.id} onClick={() => setSelectedCampaignId(String(campaign.id))} className={`group flex h-full min-w-0 flex-col justify-end rounded-xl border p-3 text-center transition-colors ${activeCampaignId === campaign.id ? "border-[#79b5cd] bg-[#f2f9fb]" : "border-transparent hover:bg-[#f7fafb]"}`}><div><p className="truncate text-sm font-semibold text-[#174f6f]">{currencyFormatter.format(campaign.total)}</p><p className="text-[10px] text-[#8b989d]">{campaign.count} fechamento{campaign.count === 1 ? "" : "s"}</p></div><div className="mt-2 flex h-44 items-end rounded-lg bg-[#edf3f5] p-1"><div className={`w-full rounded-md ${barColors[index % barColors.length]} transition-all duration-300`} style={{ height: `${height}%` }} /></div><p className="mt-2 line-clamp-2 min-h-8 text-xs font-semibold text-[#335f76]">{campaign.name}</p></button>; })}</div></div>}</CardContent></Card>

      <Card className="mb-6 overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><CardHeader className="border-b border-[#edf2f4]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2e7da3]">Meta semanal da campanha</p><CardTitle className="mt-1 text-xl text-[#174f6f]">{activeCampaign?.name || "Selecione uma campanha"}</CardTitle><p className="text-xs text-[#84949c]">S1 a S5 usam somente os fechamentos vinculados à campanha selecionada.</p></div>{campaigns.length > 0 && <div><label htmlFor="active-campaign" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Campanha exibida</label><select id="active-campaign" value={activeCampaignId ?? ""} onChange={event => setSelectedCampaignId(event.target.value)} className="h-9 max-w-xs rounded-md border border-[#d7e5ec] bg-white px-3 text-sm text-[#335f76]">{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></div>}</div></CardHeader><CardContent className="p-5 sm:p-6">{!activeCampaign || !activeTotal ? <EmptyState /> : <CampaignWeeklyChart weeks={weeks} weeklyGoal={Number(activeCampaign.weeklyGoal)} total={activeTotal.total} />}</CardContent></Card>

      {campaigns.length > 0 && <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="text-base text-[#174f6f]">Campanhas inscritas</CardTitle><p className="text-xs text-[#84949c]">Exibindo até 5 campanhas por página.</p></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1010px] text-sm"><thead><tr className="border-y border-[#e5edf1] bg-[#f7fafb] text-left text-xs uppercase tracking-wide text-[#6e7f88]"><th className="sticky left-0 z-10 bg-[#f7fafb] px-5 py-3 shadow-[8px_0_12px_-12px_rgba(23,79,111,0.45)]">Campanha</th><th className="px-5 py-3">Origem</th><th className="px-5 py-3">Período</th><th className="px-5 py-3 text-right">Meta semanal</th><th className="px-5 py-3 text-right">Valor no mês</th><th className="sticky right-0 z-10 bg-[#f7fafb] px-5 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(23,79,111,0.45)]">Ações</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{paginatedCampaigns.items.map(campaign => { const summary = totals.find(item => item.id === campaign.id); return <tr key={campaign.id}><td className="sticky left-0 z-[5] max-w-[170px] bg-white px-5 py-3 font-medium text-[#174f6f] shadow-[8px_0_12px_-12px_rgba(23,79,111,0.45)]"><span className="block">{campaign.name}</span><span className="mt-1 block text-[11px] font-normal text-[#8b989d]">{usage.find(item => item.campaignId === campaign.id)?.count ?? 0} fechamento(s) vinculado(s)</span></td><td className="px-5 py-3 text-[#617782]">{campaign.origin || "Não informada"}</td><td className="px-5 py-3 text-[#617782]">{dateFormatter.format(new Date(`${campaign.startDate}T12:00:00`))}{campaign.endDate ? ` até ${dateFormatter.format(new Date(`${campaign.endDate}T12:00:00`))}` : " em diante"}</td><td className="px-5 py-3 text-right text-[#486a7b]">{currencyFormatter.format(Number(campaign.weeklyGoal))}</td><td className="px-5 py-3 text-right font-semibold text-[#2e7da3]">{currencyFormatter.format(summary?.total ?? 0)}</td><td className="sticky right-0 z-[5] bg-white px-5 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(23,79,111,0.45)]"><div className="flex items-center justify-end gap-1.5">{user?.role === "admin" && <><Button type="button" variant="outline" size="sm" onClick={() => setEditingCampaign({ ...campaign })} className="h-8 border-[#c9dfe8] px-2.5 text-[#2e718f]"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>{(usage.find(item => item.campaignId === campaign.id)?.count ?? 0) > 0 ? <Button type="button" variant="outline" size="sm" disabled={campaigns.length < 2 || mergeMutation.isPending} onClick={() => { setMergingCampaign(campaign); setMergeTargetId(""); }} className="h-8 border-[#decda5] px-2.5 text-[#876e2c]"><Merge className="mr-1 h-3.5 w-3.5" />Mesclar</Button> : <Button type="button" variant="outline" size="sm" disabled={deleteMutation.isPending} onClick={() => removeCampaign(campaign)} className="h-8 border-[#e2baba] px-2.5 text-[#a14f4f]"><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}</>}</div></td></tr>; })}</tbody></table></div><TablePagination page={paginatedCampaigns.page} totalItems={paginatedCampaigns.totalItems} label="campanhas" onPageChange={setCampaignPage} /></CardContent></Card>}
    </>}
    <Dialog open={Boolean(editingCampaign)} onOpenChange={open => { if (!open) setEditingCampaign(null); }}><DialogContent className="border-[#d8e5eb] bg-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-[#174f6f]">Corrigir campanha</DialogTitle><DialogDescription>Altere os dados da campanha sem apagar nem desvincular os fechamentos existentes.</DialogDescription></DialogHeader>{editingCampaign && <form onSubmit={saveEditedCampaign} className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome da campanha"><Input value={editingCampaign.name} onChange={event => setEditingCampaign({ ...editingCampaign, name: event.target.value })} required /></Field></div><Field label="Origem"><Input value={editingCampaign.origin ?? ""} onChange={event => setEditingCampaign({ ...editingCampaign, origin: event.target.value })} required /></Field><Field label="Meta semanal (R$)"><Input value={String(editingCampaign.weeklyGoal).replace(".", ",")} onChange={event => setEditingCampaign({ ...editingCampaign, weeklyGoal: event.target.value })} required inputMode="decimal" /></Field><Field label="Início"><Input type="date" value={editingCampaign.startDate} onChange={event => setEditingCampaign({ ...editingCampaign, startDate: event.target.value })} required /></Field><Field label="Fim (opcional)"><Input type="date" value={editingCampaign.endDate ?? ""} onChange={event => setEditingCampaign({ ...editingCampaign, endDate: event.target.value || null })} /></Field><DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditingCampaign(null)}>Cancelar</Button><Button type="submit" disabled={updateMutation.isPending} className="bg-[#2e7da3] hover:bg-[#246989]">Salvar correção</Button></DialogFooter></form>}</DialogContent></Dialog>
    <Dialog open={Boolean(mergingCampaign)} onOpenChange={open => { if (!open) setMergingCampaign(null); }}><DialogContent className="border-[#d8e5eb] bg-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-[#174f6f]">Mesclar campanha repetida</DialogTitle><DialogDescription>Os fechamentos da campanha “{mergingCampaign?.name}” serão transferidos para a campanha de destino. A duplicata será excluída somente após a transferência.</DialogDescription></DialogHeader><Field label="Campanha que permanecerá"><select value={mergeTargetId} onChange={event => setMergeTargetId(event.target.value)} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Escolha a campanha de destino</option>{campaigns.filter(item => item.id !== mergingCampaign?.id).map(item => <option key={item.id} value={item.id}>{item.name} · {item.startDate}</option>)}</select></Field><DialogFooter><Button type="button" variant="outline" onClick={() => setMergingCampaign(null)}>Cancelar</Button><Button type="button" disabled={!mergeTargetId || mergeMutation.isPending} onClick={mergeCampaign} className="bg-[#2e7da3] hover:bg-[#246989]">Mesclar e preservar vendas</Button></DialogFooter></DialogContent></Dialog>
  </div></div></DashboardLayout>;
}

function CampaignWeeklyChart({ weeks, weeklyGoal, total }: { weeks: ReturnType<typeof calculateCampaignWeeks>; weeklyGoal: number; total: number }) {
  const chartMax = Math.max(weeklyGoal, ...weeks.map(week => week.total), 1) * 1.12;
  const goalPosition = (weeklyGoal / chartMax) * 100;
  return <><div className="mb-5 flex flex-col justify-between gap-3 rounded-xl bg-[#eef7fa] px-4 py-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-sm text-[#486a7b]"><Target className="h-4 w-4 text-[#b4a92f]" />Meta semanal: <strong>{currencyFormatter.format(weeklyGoal)}</strong></div><p className="text-sm text-[#486a7b]">Total da campanha no mês: <strong className="text-[#2e7da3]">{currencyFormatter.format(total)}</strong></p></div><div className="grid grid-cols-2 gap-4 md:grid-cols-5">{weeks.map(week => { const result = calculateWeeklyGoal(week.total, weeklyGoal); const height = week.total > 0 ? Math.max(4, (week.total / chartMax) * 100) : 2; return <div key={week.week} className="min-w-0"><div className="mb-2 text-center"><p className="truncate text-sm font-semibold text-[#174f6f]">{currencyFormatter.format(week.total)}</p><p className="text-[10px] text-[#8b989d]">{week.count} fechamento{week.count === 1 ? "" : "s"}</p></div><div className="relative flex h-48 items-end overflow-hidden rounded-xl bg-[#f3f7f8] p-1"><div className="absolute inset-x-1 z-10 border-t-2 border-dashed border-[#ad9d29]" style={{ bottom: `${goalPosition}%` }} /><div className={`w-full rounded-lg shadow-sm ${result.reached ? "bg-[#58b981]" : "bg-[#2e7da3]"}`} style={{ height: `${height}%` }} /></div><div className="mt-2 text-center"><p className="text-sm font-bold text-[#174f6f]">{week.label}</p><p className="text-[11px] text-[#8b989d]">{week.period}</p><p className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${result.reached ? "bg-[#e9f7eb] text-[#2f7b40]" : "bg-[#fff4e8] text-[#a45d28]"}`}>{result.reached ? `+${currencyFormatter.format(result.surplus)}` : `Faltam ${currencyFormatter.format(result.remaining)}`}</p></div></div>; })}</div></>;
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-[#6e7f88]"><span>{label}</span>{icon}</div><p className="mt-3 truncate text-2xl font-semibold text-[#174f6f]">{value}</p><p className="mt-1 text-xs text-[#8b989d]">{detail}</p></CardContent></Card>;
}

function EmptyState() {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#cddfe8] bg-[#f8fbfc] px-5 py-14 text-center"><Megaphone className="mb-3 h-7 w-7 text-[#79a9bd]" /><p className="font-semibold text-[#335f76]">Nenhuma campanha inscrita</p><p className="mt-1 max-w-sm text-xs text-[#8b989d]">Preencha o formulário acima. O primeiro gráfico será criado automaticamente.</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">{label}</label>{children}</div>;
}
