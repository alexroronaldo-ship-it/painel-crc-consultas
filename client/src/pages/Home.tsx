import DashboardLayout from "@/components/DashboardLayout";
import OrtoCrcManagement from "@/components/OrtoCrcManagement";
import CrcPortraitCard from "@/components/CrcPortraitCard";
import GoalProgressCard from "@/components/GoalProgressCard";
import TablePagination from "@/components/TablePagination";
import WeeklyAppointmentsDashboard from "@/components/WeeklyAppointmentsDashboard";
import WeeklySalesChart from "@/components/WeeklySalesChart";
import WeeklySpeedDashboard from "@/components/WeeklySpeedDashboard";
import WeeklyTasksDashboard from "@/components/WeeklyTasksDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { calculateCommission, commissionScenarios, formatCommissionRate, getCommissionRate } from "@/lib/commission";
import { calculateEligibleSales, isEligibleSalesCrc } from "@/lib/eligible-sales";
import { paginateItems } from "@/lib/pagination";
import { trpc } from "@/lib/trpc";
import { type TimedClosure } from "@/lib/weekly-speed";
import { CalendarDays, Check, Clock3, DollarSign, ListChecks, Loader2, Pencil, Plus, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}min ${String(seconds % 60).padStart(2, "0")}s`;
const crcNames = ["WISLLAYNI", "JAYZA"] as const;
type CrcName = (typeof crcNames)[number];
const displayCrcName = (name: string) => name === "WISLLAYNI" ? "Wisllayny" : name === "JAYZA" ? "JAYZA" : name === "VAL" ? "Vivi" : name;
const getTimeTone = (seconds: number, hasData = true) => !hasData ? { label: "Sem dados", className: "border-[#dce5dd] bg-[#f5f8f5] text-[#829287]" } : seconds < 120 ? { label: "Excelente", className: "border-[#b9dfc0] bg-[#e9f7eb] text-[#2f7b40]" } : seconds <= 300 ? { label: "Atenção", className: "border-[#f1d99b] bg-[#fff7df] text-[#9a6b12]" } : { label: "Acima do limite", className: "border-[#efb9b9] bg-[#fff0f0] text-[#a33b3b]" };
const statusLabel = { closed: "Fechado", follow_up: "Em acompanhamento", not_closed: "Não fechado" } as const;
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export default function Home() {
  const [selectedCrcId, setSelectedCrcId] = useState("WISLLAYNI");
  const teamQuery = trpc.crcTransfers.ortoList.useQuery({ scope: "funnel" });
  const team = teamQuery.data ?? [];
  const activeTeam = team.filter(crc => crc.isActive);
  const selectedCrc = team.find(crc => crc.id === selectedCrcId) ?? activeTeam[0];
  const selectCrc = (id: string) => { setSelectedCrcId(id); setCrcName(""); setRecordsPage(1); };
  const readOnly = selectedCrc?.isActive === false;
  const [crcName, setCrcName] = useState(""); const [patientName, setPatientName] = useState(""); const [phone, setPhone] = useState(""); const [closingDate, setClosingDate] = useState(""); const [closedItem, setClosedItem] = useState(""); const [value, setValue] = useState(""); const [timeMinutes, setTimeMinutes] = useState(""); const [campaignId, setCampaignId] = useState("");
  const [internalStatus, setInternalStatus] = useState("closed"); const [internalNotes, setInternalNotes] = useState(""); const [search, setSearch] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<number | null>(null); const [editingTimeMinutes, setEditingTimeMinutes] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [recordsPage, setRecordsPage] = useState(1);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityCrcName, setActivityCrcName] = useState<CrcName>("WISLLAYNI");
  const [activityWeek, setActivityWeek] = useState(1);
  const [activityTaskCount, setActivityTaskCount] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const queryInput = useMemo(() => selectedMonth ? { month: selectedMonth } : undefined, [selectedMonth]);
  const periodLabel = useMemo(() => selectedMonth ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`)) : "Todo o período", [selectedMonth]);
  const utils = trpc.useUtils(); const recordsQuery = trpc.closures.list.useQuery(queryInput); const records = recordsQuery.data ?? []; const campaignsQuery = trpc.campaigns.list.useQuery(); const campaigns = campaignsQuery.data ?? [];
  const weeklyActivitiesQuery = trpc.weeklyActivities.list.useQuery({ month: selectedMonth || currentMonth }, { enabled: Boolean(selectedMonth) });
  const weeklyActivities = weeklyActivitiesQuery.data ?? [];
  const profilesQuery = trpc.crcProfiles.list.useQuery();
  const profiles = profilesQuery.data ?? [];
  useEffect(() => { if (crcName && !activeTeam.some(crc => crc.id === crcName)) setCrcName(""); }, [teamQuery.data, crcName]);
  const createMutation = trpc.closures.create.useMutation({ onSuccess: async (_data, variables) => { setSelectedMonth(variables.closingDate.slice(0, 7)); setRecordsPage(1); await utils.closures.list.invalidate(); setPatientName(""); setPhone(""); setClosingDate(""); setClosedItem(""); setValue(""); setTimeMinutes(""); setCampaignId(""); setInternalNotes(""); toast.success("Registro salvo com sucesso", { description: "A dashboard e as campanhas foram atualizadas." }); }, onError: error => toast.error(error.message) });
  const deleteMutation = trpc.closures.deleteOne.useMutation({ onSuccess: async () => { await utils.closures.list.invalidate(); toast.success("Registro excluído com sucesso"); }, onError: error => toast.error(error.message) });
  const updateTimeMutation = trpc.closures.updateTime.useMutation({ onSuccess: async () => { await utils.closures.list.invalidate(); setEditingTimeId(null); setEditingTimeMinutes(""); toast.success("Tempo corrigido com sucesso"); }, onError: error => toast.error(error.message) });
  const saveWeeklyActivityMutation = trpc.weeklyActivities.save.useMutation({ onSuccess: async () => { await utils.weeklyActivities.list.invalidate(); setActivityDialogOpen(false); toast.success("Atividade semanal salva com sucesso"); }, onError: error => toast.error(error.message) });
  const filteredRecords = useMemo(() => { const term = search.trim().toLocaleLowerCase("pt-BR"); if (!term) return records; return records.filter(item => { const campaign = campaigns.find(campaign => campaign.id === item.campaignId); return `${item.crcName} ${item.patientName} ${item.phone} ${item.closedItem} ${item.internalStatus} ${campaign?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(term); }); }, [records, search, campaigns]);
  const paginatedRecords = useMemo(() => paginateItems(filteredRecords, recordsPage), [filteredRecords, recordsPage]);
  const eligibleRecords = records.filter(item => isEligibleSalesCrc(item.crcName));
  const total = calculateEligibleSales(records); const measured = eligibleRecords.filter(item => item.totalTimeSeconds > 0); const avgOverall = measured.length ? Math.round(measured.reduce((sum, item) => sum + item.totalTimeSeconds, 0) / measured.length) : 0;
  const metrics = crcNames.map(name => { const own = records.filter(item => item.crcName === name); const timed = own.filter(item => item.totalTimeSeconds > 0); const avg = timed.length ? Math.round(timed.reduce((sum, item) => sum + item.totalTimeSeconds, 0) / timed.length) : 0; const revenue = own.reduce((sum, item) => sum + Number(item.value), 0); return { name, records: own, count: own.length, revenue, commission: calculateCommission(revenue), rate: getCommissionRate(revenue), avg, tone: getTimeTone(avg, timed.length > 0) }; });
  const salesMetrics = metrics.filter(metric => isEligibleSalesCrc(metric.name));
 
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!activeTeam.some(crc => crc.id === crcName)) return toast.error("Selecione uma CRC ativa"); const minutes = Number(timeMinutes.replace(",", ".")); if (!Number.isFinite(minutes) || minutes < 0) return toast.error("Informe um tempo válido"); createMutation.mutate({ crcName: crcName as "WISLLAYNI" | "JAYZA", patientName, phone, closingDate, closedItem, value, totalTimeSeconds: Math.round(minutes * 60), internalStatus: internalStatus as "closed" | "follow_up" | "not_closed", internalNotes: internalNotes || undefined, campaignId: campaignId ? Number(campaignId) : undefined }); };
  const deleteOne = (id: number) => { const password = window.prompt("Digite a senha para remover este registro:"); if (password === null) return; if (!window.confirm("Remover este registro?")) return; deleteMutation.mutate({ id, password }); };
  const startTimeEdit = (id: number, seconds: number) => { setEditingTimeId(id); setEditingTimeMinutes(seconds > 0 ? String(Number((seconds / 60).toFixed(2))).replace(".", ",") : ""); };
  const saveTime = (id: number) => { const minutes = Number(editingTimeMinutes.replace(",", ".")); if (!Number.isFinite(minutes) || minutes < 0) return toast.error("Informe um tempo válido"); updateTimeMutation.mutate({ id, totalTimeSeconds: Math.round(minutes * 60) }); };
  const openWeeklyActivity = (name: CrcName, preferredWeek?: number) => { if (!activeTeam.some(crc => crc.id === name)) return; if (!selectedMonth) return toast.error("Selecione um mês para registrar a atividade semanal"); const own = weeklyActivities.filter(activity => activity.crcName === name); const selectedWeek = preferredWeek ?? [1, 2, 3, 4, 5].find(week => !own.some(activity => activity.week === week)) ?? 5; const existing = own.find(activity => activity.week === selectedWeek); setActivityCrcName(name); setActivityWeek(selectedWeek); setActivityTaskCount(existing ? String(existing.taskCount) : ""); setActivityDescription(existing?.description ?? ""); setActivityDialogOpen(true); };
  const changeActivityWeek = (week: number) => { setActivityWeek(week); const existing = weeklyActivities.find(activity => activity.crcName === activityCrcName && activity.week === week); setActivityTaskCount(existing ? String(existing.taskCount) : ""); setActivityDescription(existing?.description ?? ""); };
  const submitWeeklyActivity = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedMonth) return toast.error("Selecione um mês"); const taskCount = Number(activityTaskCount); if (!Number.isInteger(taskCount) || taskCount < 0) return toast.error("Informe uma quantidade válida de tarefas"); saveWeeklyActivityMutation.mutate({ crcName: activityCrcName, month: selectedMonth, week: activityWeek, taskCount, description: activityDescription }); };

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><img src="/manus-storage/ortoimplante-logo-new_f9d1ae47.png" alt="Ortoimplante — Odontologia Estética" className="mb-5 h-24 w-auto max-w-full object-contain object-left sm:h-28" /><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Comissão Novos Pacientes - Ortoimplante</h1><p className="mt-1 text-sm text-[#6e7f88]">Vendas elegíveis, metas e bonificações da equipe de fechamento.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div><label htmlFor="period-filter" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Período da dashboard</label><Input id="period-filter" type="month" value={selectedMonth} onChange={event => { setSelectedMonth(event.target.value); setRecordsPage(1); }} className="h-9 w-44 border-[#d7e5ec] bg-white" /></div><Button type="button" variant="outline" onClick={() => { setSelectedMonth(""); setRecordsPage(1); }} className="h-9 border-[#d7e5ec] bg-white text-[#486a7b]">Todo período</Button></div></header>
    <div className="mb-4 flex items-center gap-2 text-xs text-[#6e7f88]"><CalendarDays className="h-4 w-4 text-[#b4a92f]" /><span>Indicadores, metas e registros de <strong className="capitalize text-[#174f6f]">{periodLabel}</strong></span></div>
    <section className="mb-6"><Card className="overflow-hidden border-[#cddfe8] bg-white shadow-sm"><CardContent className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-[#6e7f88]">Vendas elegíveis totais</p><p className="mt-2 text-3xl font-semibold text-[#174f6f]">{currencyFormatter.format(total)}</p><p className="mt-1 text-xs text-[#8b989d]">{eligibleRecords.length} fechamentos de Wisllayny e JAYZA no período</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f1f6]"><DollarSign className="h-6 w-6 text-[#2e7da3]" /></div></CardContent></Card></section>
    <OrtoCrcManagement scope="funnel" crcs={team} selectedId={selectedCrc?.id ?? ""} onSelect={selectCrc} />
    {teamQuery.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar a equipe: {teamQuery.error.message}</p>}
    {selectedCrc && readOnly && <p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Histórico de {selectedCrc.name} · CRC retirada somente deste Funil. Metas e tarefas originais preservadas. Reativar não devolve os pacientes transferidos.</p>}
    {selectedCrc ? <Tabs value={selectedCrc.id} onValueChange={selectCrc} className="mb-8">
      <TabsList className="mb-4 grid h-auto w-full grid-cols-2 rounded-xl bg-[#e8f0f4] p-1">{activeTeam.some(crc => crc.id === "WISLLAYNI") && <TabsTrigger value="WISLLAYNI" className="rounded-lg py-3 data-[state=active]:bg-white data-[state=active]:text-[#1f6f96] data-[state=active]:shadow-sm">Wisllayny</TabsTrigger>}{activeTeam.some(crc => crc.id === "JAYZA") && <TabsTrigger value="JAYZA" className="rounded-lg py-3 data-[state=active]:bg-white data-[state=active]:text-[#1f6f96] data-[state=active]:shadow-sm">JAYZA</TabsTrigger>}</TabsList>
      {salesMetrics.map(metric => <TabsContent key={metric.name} value={metric.name} className="mt-0"><IndividualPerformance metric={metric} month={selectedMonth} enabled={Boolean(selectedMonth)} readOnly={readOnly} weeklyActivities={weeklyActivities.filter(activity => activity.crcName === metric.name)} onAddActivity={() => openWeeklyActivity(metric.name as CrcName)} onEditActivity={week => openWeeklyActivity(metric.name as CrcName, week)} photoUrl={profiles.find(profile => profile.crcName === metric.name)?.photoUrl} /></TabsContent>)}
    </Tabs> : <p className="mb-4 text-sm text-[#617782]">{teamQuery.isLoading ? "Carregando equipe..." : "Nenhuma CRC ativa. Reative uma profissional para novos lançamentos."}</p>}
    {activeTeam.length > 0 && <Card className="mb-6 border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e5f1f6] text-[#2e7da3]"><Plus className="h-4 w-4" /></div><div><h2 className="font-semibold text-[#174f6f]">Novo fechamento</h2><p className="text-xs text-[#7d8d95]">Dados comerciais e fechamento interno do atendimento.</p></div></div><form onSubmit={submit} className="grid gap-3 md:grid-cols-4"><Field label="Nome do CRC"><select value={crcName} onChange={e => setCrcName(e.target.value)} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm"><option value="">Selecionar</option>{activeTeam.map(crc => <option key={crc.id} value={crc.id}>{crc.name}</option>)}</select></Field><Field label="Campanha (opcional)"><select value={campaignId} onChange={event => setCampaignId(event.target.value)} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm"><option value="">Sem campanha</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field><Field label="Nome do paciente"><Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Nome completo" required /></Field><Field label="Telefone"><Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-0000" required /></Field><Field label="Data que fechou"><Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} required /></Field><Field label="O que fechou"><Textarea value={closedItem} onChange={e => setClosedItem(e.target.value)} placeholder="Produto ou serviço" required className="min-h-10 resize-none py-2" /></Field><Field label="Valor (R$)"><Input value={value} onChange={e => setValue(e.target.value.replace(/[^\d,]/g, ""))} placeholder="0,00" inputMode="decimal" required /></Field><Field label="Tempo total (min)"><Input value={timeMinutes} onChange={e => setTimeMinutes(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="1,5" inputMode="decimal" required /></Field><Field label="Status interno"><select value={internalStatus} onChange={e => setInternalStatus(e.target.value)} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm"><option value="closed">Fechado</option><option value="follow_up">Em acompanhamento</option><option value="not_closed">Não fechado</option></select></Field><div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Motivo / observação interna</label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Contexto do encerramento do atendimento" className="min-h-10 resize-none" /></div><div className="flex items-end"><Button type="submit" disabled={createMutation.isPending} className="h-10 w-full bg-[#2e7da3] hover:bg-[#246989]">{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Adicionar</>}</Button></div></form></CardContent></Card>}
    <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-[#e3edf1] p-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#174f6f]">Registros da equipe</h2><p className="text-xs text-[#7d8d95]">Use as ações de cada linha para corrigir o tempo ou excluir somente aquele registro.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa1aa]" /><Input value={search} onChange={e => { setSearch(e.target.value); setRecordsPage(1); }} placeholder="Buscar paciente, CRC ou campanha" className="h-9 pl-9 text-sm" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1540px] text-left text-sm"><thead className="bg-[#f7fafb] text-xs uppercase tracking-wide text-[#708374]"><tr><th className="px-4 py-3">CRC</th><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Fechou</th><th className="px-4 py-3">Campanha</th><th className="px-4 py-3">Tempo</th><th className="px-4 py-3">Status interno</th><th className="px-4 py-3 text-right">Valor</th><th className="sticky right-0 z-10 bg-[#f7fafb] px-4 py-3 shadow-[-8px_0_12px_-12px_rgba(23,79,111,0.45)]">Ações por linha</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{recordsQuery.isLoading ? <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" />Carregando...</td></tr> : filteredRecords.length === 0 ? <tr><td colSpan={10} className="py-14 text-center"><UserRound className="mx-auto mb-2 h-6 w-6 text-[#9aadb6]" /><p className="font-medium text-[#486a7b]">Nenhum registro encontrado</p></td></tr> : paginatedRecords.items.map(record => { const tone = getTimeTone(record.totalTimeSeconds, record.totalTimeSeconds > 0); const isEditingTime = editingTimeId === record.id; const campaign = campaigns.find(item => item.id === record.campaignId); return <tr key={record.id} className="hover:bg-[#fbfdfe]"><td className="px-4 py-4"><Badge variant="outline" className="border-[#cfe1e9] bg-[#f4faf4] text-[#2e7da3]">{displayCrcName(record.crcName)}</Badge></td><td className="px-4 py-4 font-medium text-[#174f6f]">{record.patientName}</td><td className="px-4 py-4 text-[#617782]">{record.phone}</td><td className="px-4 py-4 whitespace-nowrap">{dateFormatter.format(new Date(`${record.closingDate}T12:00:00`))}</td><td className="max-w-xs px-4 py-4 text-[#617782]">{record.closedItem}</td><td className="max-w-[180px] px-4 py-4 text-xs text-[#486a7b]">{campaign?.name || "Sem campanha"}</td><td className="px-4 py-4">{isEditingTime ? <div className="flex items-center gap-1"><Input autoFocus value={editingTimeMinutes} onChange={event => setEditingTimeMinutes(event.target.value.replace(/[^\d,.]/g, ""))} onKeyDown={event => { if (event.key === "Enter") saveTime(record.id); if (event.key === "Escape") setEditingTimeId(null); }} placeholder="Minutos" inputMode="decimal" className="h-8 w-20" /><span className="text-xs text-[#7d8d95]">min</span></div> : <Badge variant="outline" className={tone.className}><Clock3 className="mr-1 h-3 w-3" />{record.totalTimeSeconds > 0 ? formatDuration(record.totalTimeSeconds) : "Sem dados"}</Badge>}</td><td className="px-4 py-4"><Badge variant="outline" className="border-[#d8e5eb] text-[#486a7b]">{statusLabel[record.internalStatus]}</Badge><p className="mt-1 max-w-xs text-[11px] text-[#8b989d]">{record.internalNotes || "Sem observação"}</p></td><td className="px-4 py-4 text-right font-semibold text-[#2e7da3]">{currencyFormatter.format(Number(record.value))}</td><td className="sticky right-0 z-[5] bg-white px-4 py-4 shadow-[-8px_0_12px_-12px_rgba(23,79,111,0.45)]">{isEditingTime ? <div className="flex gap-1.5"><Button type="button" size="sm" onClick={() => saveTime(record.id)} disabled={updateTimeMutation.isPending} className="h-8 bg-[#2e7da3] px-2.5 hover:bg-[#246989]"><Save className="mr-1.5 h-3.5 w-3.5" />Salvar</Button><Button type="button" size="sm" variant="outline" onClick={() => { setEditingTimeId(null); setEditingTimeMinutes(""); }} className="h-8 px-2.5"><X className="h-3.5 w-3.5" /></Button></div> : <div className="flex gap-1.5"><Button type="button" variant="outline" onClick={() => startTimeEdit(record.id, record.totalTimeSeconds)} className="h-8 whitespace-nowrap border-[#c9dfe8] px-2.5 text-[#2e718f] hover:bg-[#eef7fa]"><Pencil className="mr-1.5 h-3.5 w-3.5" />Corrigir tempo</Button><Button type="button" variant="outline" onClick={() => deleteOne(record.id)} className="h-8 whitespace-nowrap border-[#e2baba] px-2.5 text-[#a14f4f] hover:bg-[#fff0f0]"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button></div>}</td></tr>; })}</tbody></table></div><TablePagination page={paginatedRecords.page} totalItems={paginatedRecords.totalItems} label="fechamentos" onPageChange={setRecordsPage} /></Card>
    <div className="mt-6"><WeeklySalesChart records={eligibleRecords} month={selectedMonth} /></div>
    <p className="mt-4 text-xs text-[#84949c]">Acesso restrito à gerente e equipe autenticada. Cada registro pode ser corrigido ou excluído individualmente.</p>
    <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}><DialogContent className="border-[#d8e5eb] bg-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-[#174f6f]">Atividade semanal · {displayCrcName(activityCrcName)}</DialogTitle><DialogDescription>Registre uma vez por semana a quantidade e o descritivo das tarefas realizadas. A meta mínima é de 100 tarefas por CRC em cada semana.</DialogDescription></DialogHeader><form onSubmit={submitWeeklyActivity} className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Field label="CRC"><Input value={displayCrcName(activityCrcName)} disabled /></Field><Field label="Semana"><select value={activityWeek} onChange={event => changeActivityWeek(Number(event.target.value))} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm">{[1, 2, 3, 4, 5].map(week => <option key={week} value={week}>S{week}</option>)}</select></Field><Field label="Quantidade de tarefas"><Input type="number" min="0" step="1" value={activityTaskCount} onChange={event => setActivityTaskCount(event.target.value)} placeholder="Meta: 100" required /></Field></div><Field label="Tarefas realizadas"><Textarea value={activityDescription} onChange={event => setActivityDescription(event.target.value)} placeholder="Ex.: retornos realizados, confirmações, contatos e organização da agenda" className="min-h-32 resize-y" required /></Field><div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map(week => { const saved = weeklyActivities.find(activity => activity.crcName === activityCrcName && activity.week === week); return <button type="button" key={week} onClick={() => changeActivityWeek(week)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${activityWeek === week ? "border-[#2e7da3] bg-[#e9f4f8] text-[#174f6f]" : (saved?.taskCount ?? 0) >= 100 ? "border-[#b9dfc0] bg-[#eef8f0] text-[#3f8750]" : saved ? "border-[#f1d99b] bg-[#fff7df] text-[#9a6b12]" : "border-[#d8e5eb] bg-white text-[#7d8d95]"}`}>S{week} {saved ? saved.taskCount : ""}</button>; })}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveWeeklyActivityMutation.isPending} className="bg-[#2e7da3] hover:bg-[#246989]">{saveWeeklyActivityMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Salvar atividade</>}</Button></DialogFooter></form></DialogContent></Dialog>
  </div></div></DashboardLayout>;
}

type CrcMetric = { name: string; revenue: number; commission: number; count: number } & { records: TimedClosure[]; rate: number; avg: number; tone: { label: string; className: string } };

function IndividualPerformance({ metric, month, enabled, weeklyActivities, onAddActivity, onEditActivity, photoUrl, readOnly = false }: {
  metric: CrcMetric;
  month: string;
  enabled: boolean;
  weeklyActivities: Array<{ week: number; taskCount: number; description: string }>;
  onAddActivity: () => void;
  onEditActivity: (week: number) => void;
  photoUrl?: string;
  readOnly?: boolean;
}) {
  const weeksAtGoal = weeklyActivities.filter(activity => activity.taskCount >= 100).length;
  const totalTasks = weeklyActivities.reduce((sum, activity) => sum + activity.taskCount, 0);
  const name = displayCrcName(metric.name);

  return <>
    <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,300px)] lg:items-stretch">
      <div className="min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><p className="text-sm text-[#6e7f88]">Venda elegível individual</p><p className="mt-4 text-2xl font-semibold text-[#174f6f]">{currencyFormatter.format(metric.revenue)}</p><p className="mt-1 text-xs text-[#8b989d]">Percentual atual: {formatCommissionRate(metric.rate)}</p></CardContent></Card>
          <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[#6e7f88]">Meta semanal de tarefas</p><p className="mt-4 text-2xl font-semibold text-[#174f6f]">{weeksAtGoal}/5</p><p className="mt-1 text-xs text-[#8b989d]">{totalTasks} tarefas · mínimo de 100 por semana</p></div><ListChecks className="h-5 w-5 text-[#2e7da3]" /></div><Button type="button" onClick={onAddActivity} disabled={!enabled || readOnly} variant="outline" className="mt-4 w-full border-[#c9dfe8] text-[#2e718f] hover:bg-[#eef7fa]"><Plus className="mr-2 h-4 w-4" />Adicionar atividade semanal</Button></CardContent></Card>
        </div>
        <GoalProgressCard name={name} revenue={metric.revenue} />
      </div>
      <CrcPortraitCard crcName={metric.name as CrcName} displayName={name} commission={metric.commission} month={month} photoUrl={photoUrl} readOnly={readOnly} />
    </div>
    <div className="mt-4"><WeeklyTasksDashboard readOnly={readOnly} name={name} records={weeklyActivities} enabled={enabled} onAdd={onAddActivity} onEdit={onEditActivity} buttonLabel="Registrar ou editar tarefas" /></div>
    <div className="mt-4"><WeeklySpeedDashboard records={metric.records} enabled={enabled} displayName={name} /></div>
    <div className="mt-4"><WeeklyAppointmentsDashboard readOnly={readOnly} month={month} crcName={metric.name as CrcName} displayName={name} /></div>
    <div className="mt-4"><CommissionTable name={name} revenue={metric.revenue} rate={metric.rate} commission={metric.commission} /></div>
  </>;
}

function CommissionTable({ name, revenue, rate, commission }: { name: string; revenue: number; rate: number; commission: number }) {
  const rows = [
    { label: "Resultado atual", revenue, rate, commission, current: true },
    ...commissionScenarios.map(value => ({
      label: "Simulação",
      revenue: value,
      rate: getCommissionRate(value),
      commission: calculateCommission(value),
      current: false,
    })),
  ];

  return <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm">
    <CardHeader className="border-b border-[#edf2f4] pb-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6c8d72]">Simulação mensal</p><CardTitle className="mt-1 text-lg text-[#174f6f]">{name}</CardTitle><p className="mt-1 text-xs text-[#8b989d]">Se terminar o mês com:</p></div>
        <div className="rounded-lg bg-[#eef7fa] px-3 py-2 text-right"><p className="text-[11px] text-[#6e7f88]">Comissão atual</p><p className="text-base font-semibold text-[#2e7da3]">{currencyFormatter.format(commission)}</p></div>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="border-b border-[#edf2f4] bg-[#fafcfa] text-left text-xs text-[#6e7f88]"><th className="px-5 py-3 font-semibold">Venda elegível</th><th className="px-5 py-3 text-center font-semibold">Percentual</th><th className="px-5 py-3 text-right font-semibold">Comissão</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{rows.map((row, index) => <tr key={`${row.label}-${row.revenue}-${index}`} className={row.current ? "bg-[#eef7fa]" : "hover:bg-[#fbfdfe]"}><td className="px-5 py-3"><div className="font-medium text-[#174f6f]">{currencyFormatter.format(row.revenue)}</div>{row.current && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2e7da3]">Resultado atual</span>}</td><td className="px-5 py-3 text-center font-medium text-[#486a7b]">{formatCommissionRate(row.rate)}</td><td className="px-5 py-3 text-right font-semibold text-[#174f6f]">{currencyFormatter.format(row.commission)}</td></tr>)}</tbody></table></div>
    </CardContent>
  </Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">{label}</label>{children}</div>; }
