import DashboardLayout from "@/components/DashboardLayout";
import OrtoCrcManagement from "@/components/OrtoCrcManagement";
import OrthoActiveCrcPanel from "@/components/OrthoActiveCrcPanel";
import { ActiveCampaignChart, ActiveWeeklyChart } from "@/components/OrthoActiveCharts";
import TablePagination from "@/components/TablePagination";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_CRC_LABELS, calculateActiveMetrics, type ActiveCrcName } from "@/lib/ortho-active";
import { paginateItems } from "@/lib/pagination";
import { trpc } from "@/lib/trpc";
import { Check, DollarSign, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const names = Object.keys(ACTIVE_CRC_LABELS) as ActiveCrcName[];
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateDisplay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
const statusLabel = { closed: "Fechado", follow_up: "Em acompanhamento", not_closed: "Não fechado" } as const;
type CampaignForm = { name: string; origin: string; startDate: string; endDate: string; weeklyGoal: string };
const emptyCampaign = (): CampaignForm => ({ name: "", origin: "", startDate: "", endDate: "", weeklyGoal: "" });

export default function OrthoActive() {
  const { user } = useAuth();
  const [selectedCrcId, setSelectedCrcId] = useState("WISLLAYNI");
  const teamQuery = trpc.crcTransfers.ortoList.useQuery({ scope: "ortho_active" });
  const team = teamQuery.data ?? [];
  const activeTeam = team.filter(crc => crc.isActive);
  const selectedCrc = team.find(crc => crc.id === selectedCrcId) ?? activeTeam[0];
  const readOnly = selectedCrc?.isActive === false;
  const selectCrc = (id: string) => { setSelectedCrcId(id); setCrcName(""); setPage(1); };
  const [month, setMonth] = useState(currentMonth);
  const [crcName, setCrcName] = useState<ActiveCrcName | "">("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactChannel, setContactChannel] = useState<"WhatsApp" | "Ligação" | "Presencial" | "Instagram" | "">("");
  const [reference, setReference] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [closedItem, setClosedItem] = useState("");
  const [value, setValue] = useState("");
  const [internalStatus, setInternalStatus] = useState<"closed" | "follow_up" | "not_closed">("closed");
  const [internalNotes, setInternalNotes] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(emptyCampaign);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => ({ month: month || undefined }), [month]);
  const patientsQuery = trpc.orthoActive.patients.list.useQuery(queryInput);
  const campaignsQuery = trpc.orthoActive.campaigns.list.useQuery();
  const profilesQuery = trpc.crcProfiles.list.useQuery();
  const goalsQuery = trpc.orthoActive.goals.list.useQuery({ month: month || currentMonth }, { enabled: Boolean(month) });
  const weeksQuery = trpc.orthoActive.weekly.list.useQuery({ month: month || currentMonth }, { enabled: Boolean(month) });
  const patients = (patientsQuery.data ?? []).filter(item => names.includes(item.crcName as ActiveCrcName)), campaigns = campaignsQuery.data ?? [];
  const selectedCampaign = campaigns.find(item => item.id === Number(selectedCampaignId)) ?? campaigns[0];
  const metrics = calculateActiveMetrics(patients);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  useEffect(() => { if (crcName && !activeTeam.some(crc => crc.id === crcName)) setCrcName(""); }, [teamQuery.data, crcName]);

  const createPatient = trpc.orthoActive.patients.create.useMutation({
    onSuccess: async (_result, input) => { setMonth(input.closingDate.slice(0, 7)); setPage(1); await utils.orthoActive.patients.list.invalidate(); setPatientName(""); setPhone(""); setContactChannel(""); setReference(""); setClosingDate(""); setClosedItem(""); setValue(""); setInternalNotes(""); setCampaignId(""); toast.success("Paciente ativo registrado com sucesso"); },
    onError: error => toast.error(error.message),
  });
  const deletePatient = trpc.orthoActive.patients.deleteOne.useMutation({ onSuccess: async () => { await utils.orthoActive.patients.list.invalidate(); toast.success("Registro excluído"); }, onError: error => toast.error(error.message) });
  const createCampaign = trpc.orthoActive.campaigns.create.useMutation({ onSuccess: async () => { await utils.orthoActive.campaigns.list.invalidate(); setCampaignDialogOpen(false); setCampaignForm(emptyCampaign()); toast.success("Campanha de Pacientes Ativos cadastrada"); }, onError: error => toast.error(error.message) });
  const updateCampaign = trpc.orthoActive.campaigns.update.useMutation({ onSuccess: async () => { await utils.orthoActive.campaigns.list.invalidate(); setEditingCampaignId(null); setCampaignForm(emptyCampaign()); setCampaignDialogOpen(false); toast.success("Campanha corrigida"); }, onError: error => toast.error(error.message) });
  const deleteCampaign = trpc.orthoActive.campaigns.deleteOne.useMutation({ onSuccess: async () => { await utils.orthoActive.campaigns.list.invalidate(); setCampaignId(""); toast.success("Campanha sem pacientes excluída"); }, onError: error => toast.error(error.message) });

  const filtered = useMemo(() => { const term = search.trim().toLocaleLowerCase("pt-BR"); return term ? patients.filter(item => `${item.patientName} ${item.phone} ${item.crcName} ${item.closedItem} ${item.contactChannel ?? ""} ${item.reference ?? ""} ${campaigns.find(c => c.id === item.campaignId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(term)) : patients; }, [patients, search, campaigns]);
  const paginated = paginateItems(filtered, page);
  const submitPatient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!crcName || !activeTeam.some(crc => crc.id === crcName)) return toast.error("Selecione uma CRC ativa");
    if (!contactChannel) return toast.error("Selecione o canal de contato");
    if (!reference.trim()) return toast.error("Informe a referência ou selecione Não se aplica");
    createPatient.mutate({ crcName, patientName, phone, contactChannel, reference, closingDate, closedItem, value, internalStatus, internalNotes: internalNotes || undefined, campaignId: campaignId ? Number(campaignId) : undefined });
  };
  const confirmDelete = (id: number) => {
    if (!window.confirm("Excluir apenas este paciente da página Pacientes Ativos? Esta ação não pode ser desfeita.")) return;
    const password = window.prompt("Digite a senha provisória para excluir este registro:");
    if (password !== null) deletePatient.mutate({ id, password });
  };
  const openCampaign = (id?: number) => {
    const existing = campaigns.find(c => c.id === id);
    setEditingCampaignId(id ?? null);
    setCampaignForm(existing ? { name: existing.name, origin: existing.origin, startDate: existing.startDate, endDate: existing.endDate ?? "", weeklyGoal: existing.weeklyGoal?.replace(".", ",") ?? "" } : emptyCampaign());
    setCampaignDialogOpen(true);
  };
  const submitCampaign = (event: React.FormEvent) => {
    event.preventDefault();
    const input = { name: campaignForm.name, origin: campaignForm.origin, startDate: campaignForm.startDate, endDate: campaignForm.endDate || undefined, weeklyGoal: campaignForm.weeklyGoal || undefined };
    if (editingCampaignId) updateCampaign.mutate({ ...input, id: editingCampaignId }); else createCampaign.mutate(input);
  };
  const confirmCampaignDelete = (id: number) => {
    if (!window.confirm("Excluir esta campanha de Pacientes Ativos? Campanhas com pacientes vinculados não podem ser apagadas.")) return;
    const password = window.prompt("Senha provisória para excluir a campanha:");
    if (password !== null) deleteCampaign.mutate({ id, password });
  };

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><img src="/manus-storage/ortoimplante-logo-new_f9d1ae47.png" alt="Orto Implante" className="mb-4 h-20 w-auto max-w-full object-contain object-left sm:h-24" /><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Pacientes Ativos Orto Implante</h1><p className="mt-1 text-sm text-[#6e7f88]">Registros, campanhas e metas próprios · independentes do Funil de Vendas Orto Implante.</p></div><div><label htmlFor="active-period" className="mb-1 block text-xs font-semibold uppercase text-[#6e7f88]">Período</label><div className="flex gap-2"><Input id="active-period" type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }} className="w-44 bg-white" /><Button type="button" variant="outline" className="bg-white" onClick={() => { setMonth(""); setPage(1); }}>Todo período</Button></div></div></header>
    <Card className="border-[#cddfe8] bg-white shadow-sm"><CardContent className="flex items-center justify-between gap-4 p-6"><div><p className="text-sm text-[#6e7f88]">Vendas fechadas · Pacientes Ativos</p><p className="mt-2 text-3xl font-semibold text-[#174f6f]">{money.format(metrics.revenue)}</p><p className="mt-1 text-xs text-[#8b989d]">{metrics.closedCount} fechamentos neste período · não inclui vendas do funil anterior</p></div><div className="rounded-2xl bg-[#e5f1f6] p-3 text-[#2e7da3]"><DollarSign className="h-6 w-6" /></div></CardContent></Card>
    {patientsQuery.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar pacientes: {patientsQuery.error.message}</p>}
    <OrtoCrcManagement scope="ortho_active" crcs={team} selectedId={selectedCrc?.id ?? ""} onSelect={selectCrc} />
    {teamQuery.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar a equipe: {teamQuery.error.message}</p>}
    {selectedCrc && readOnly && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Histórico de {selectedCrc.name} · retirada somente de Pacientes Ativos. Metas, tarefas e agendamentos anteriores preservados.</p>}
    {selectedCrc ? <Tabs value={selectedCrc.id} onValueChange={selectCrc}><TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-[#e8f0f4] p-1">{names.filter(name => activeTeam.some(crc => crc.id === name)).map(name => <TabsTrigger key={name} value={name} className="rounded-lg py-2.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#1f6f96]"><span aria-hidden="true" className="mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dceaf0] text-xs text-[#2e718f]">{profilesQuery.data?.find(profile => profile.crcName === name)?.photoUrl ? <img src={profilesQuery.data.find(profile => profile.crcName === name)!.photoUrl} alt="" className="h-full w-full object-cover object-top" /> : ACTIVE_CRC_LABELS[name].slice(0, 1)}</span>{ACTIVE_CRC_LABELS[name]}</TabsTrigger>)}</TabsList>{names.map(name => <TabsContent key={name} value={name} className="mt-4"><OrthoActiveCrcPanel crcName={name} month={month} records={patients} goals={goalsQuery.data ?? []} weekly={weeksQuery.data ?? []} isAdmin={user?.role === "admin"} readOnly={readOnly} photoUrl={profilesQuery.data?.find(profile => profile.crcName === name)?.photoUrl} /></TabsContent>)}</Tabs> : <p className="text-sm text-[#617782]">{teamQuery.isLoading ? "Carregando equipe..." : "Nenhuma CRC ativa nesta página. Reative uma profissional para registrar pacientes."}</p>}

    <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-lg text-[#174f6f]">Campanhas dos Pacientes Ativos</CardTitle><p className="mt-1 text-xs text-[#7d8d95]">Cadastro separado das campanhas do Funil de Vendas.</p></div><Button type="button" variant="outline" onClick={() => openCampaign()}><Plus className="mr-1.5 h-4 w-4" />Nova campanha</Button></div></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{campaigns.map(campaign => { const count = patients.filter(p => p.campaignId === campaign.id).length; return <div key={campaign.id} className="rounded-xl border border-[#dce8ed] bg-[#fbfdfe] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold text-[#174f6f]">{campaign.name}</p><p className="text-xs text-[#7d8d95]">{campaign.origin} · {dateDisplay(campaign.startDate)}</p></div>{user?.role === "admin" && <div className="flex gap-1"><Button type="button" size="icon" variant="ghost" title="Corrigir campanha" aria-label={`Corrigir campanha ${campaign.name}`} onClick={() => openCampaign(campaign.id)}><Pencil className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" title="Excluir campanha sem pacientes" aria-label={`Excluir campanha ${campaign.name}`} onClick={() => confirmCampaignDelete(campaign.id)}><Trash2 className="h-4 w-4 text-[#a14f4f]" /></Button></div>}</div><p className="mt-2 text-[11px] text-[#6e7f88]">Meta semanal: {campaign.weeklyGoal ? money.format(Number(campaign.weeklyGoal)) : "a definir"} · {count} registro{count === 1 ? "" : "s"} neste período</p></div>; })}</div>{!campaigns.length && <p className="rounded-xl bg-[#f7fafb] p-5 text-center text-sm text-[#6e7f88]">Ainda não há campanhas nesta página.</p>}</CardContent></Card>
    <ActiveCampaignChart records={patients} campaigns={campaigns} />
    {selectedCampaign && <section className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-base font-semibold text-[#174f6f]">Meta semanal de uma campanha</h2><label className="text-xs font-semibold text-[#486a7b]">Campanha exibida <select value={selectedCampaign.id} onChange={e => setSelectedCampaignId(e.target.value)} className="mt-1 block h-9 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm sm:w-72">{campaigns.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><ActiveWeeklyChart records={patients.filter(item => item.campaignId === selectedCampaign.id)} month={month} weeklyGoal={selectedCampaign.weeklyGoal ? Number(selectedCampaign.weeklyGoal) : null} title={`Vendas semanais · ${selectedCampaign.name}`} /></section>}
    {activeTeam.length > 0 && <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-[#174f6f]"><Plus className="h-5 w-5 text-[#2e7da3]" />Novo registro de paciente ativo</CardTitle><p className="text-xs text-[#7d8d95]">Nome, telefone, canal de contato e referência são obrigatórios. Nenhum dado será lançado no Funil de Vendas.</p></CardHeader><CardContent><form onSubmit={submitPatient} className="grid gap-3 md:grid-cols-4"><Field label="Nome do CRC"><select value={crcName} onChange={e => setCrcName(e.target.value as ActiveCrcName | "")} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Selecionar</option>{activeTeam.map(crc => <option key={crc.id} value={crc.id}>{crc.name}</option>)}</select></Field><Field label="Campanha (opcional)"><select value={campaignId} onChange={e => setCampaignId(e.target.value)} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Sem campanha</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Nome do paciente"><Input value={patientName} onChange={e => setPatientName(e.target.value)} required placeholder="Nome completo" /></Field><Field label="Telefone"><Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required placeholder="(11) 99999-0000" /></Field><Field label="Canal de contato"><select value={contactChannel} onChange={e => setContactChannel(e.target.value as typeof contactChannel)} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Selecionar</option><option value="WhatsApp">WhatsApp</option><option value="Ligação">Ligação</option><option value="Presencial">Presencial</option><option value="Instagram">Instagram</option></select></Field><Field label="Referência"><Input value={reference} onChange={e => setReference(e.target.value)} list="ortho-reference-options" required placeholder="Dentista, paciente ou Não se aplica" /><datalist id="ortho-reference-options"><option value="Não se aplica" /></datalist></Field><Field label="Data que fechou"><Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} required /></Field><Field label="O que fechou"><Textarea value={closedItem} onChange={e => setClosedItem(e.target.value)} required className="min-h-10 resize-none py-2" placeholder="Produto ou serviço" /></Field><Field label="Valor (R$)"><Input value={value} onChange={e => setValue(e.target.value.replace(/[^\d,]/g, ""))} required inputMode="decimal" placeholder="0,00" /></Field><Field label="Status interno"><select value={internalStatus} onChange={e => setInternalStatus(e.target.value as typeof internalStatus)} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="closed">Fechado</option><option value="follow_up">Em acompanhamento</option><option value="not_closed">Não fechado</option></select></Field><div className="md:col-span-2"><Field label="Motivo / observação interna"><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Contexto do atendimento" className="min-h-10 resize-none" /></Field></div><div className="flex items-end"><Button type="submit" disabled={createPatient.isPending} className="h-10 w-full bg-[#2e7da3] hover:bg-[#246989]">{createPatient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Adicionar</>}</Button></div></form></CardContent></Card>}
    <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-[#e3edf1] p-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#174f6f]">Registros de pacientes ativos</h2><p className="text-xs text-[#7d8d95]">Cinco por página · exclusão individual protegida por senha.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa1aa]" /><Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar paciente, CRC ou campanha" className="h-9 pl-9" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1480px] text-left text-sm"><thead className="bg-[#f7fafb] text-xs uppercase text-[#617782]"><tr>{["CRC", "Paciente", "Telefone", "Canal", "Referência", "Fechamento", "O que fechou", "Campanha", "Status", "Valor"].map(item => <th key={item} className="px-4 py-3">{item}</th>)}<th className="sticky right-0 z-10 bg-[#f7fafb] px-4 py-3">Ações</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{patientsQuery.isLoading ? <tr><td colSpan={11} className="py-10 text-center text-[#617782]">Carregando registros...</td></tr> : filtered.length === 0 ? <tr><td colSpan={11} className="py-10 text-center text-[#617782]">Nenhum paciente registrado neste período.</td></tr> : paginated.items.map(record => <tr key={record.id} className="hover:bg-[#fbfdfe]"><td className="px-4 py-4 font-medium">{ACTIVE_CRC_LABELS[record.crcName as ActiveCrcName] ?? record.crcName}</td><td className="px-4 py-4 font-semibold text-[#174f6f]">{record.patientName}</td><td className="px-4 py-4">{record.phone}</td><td className="px-4 py-4">{record.contactChannel ?? "Não informado"}</td><td className="max-w-48 px-4 py-4">{record.reference ?? "Não informado"}</td><td className="px-4 py-4">{dateDisplay(record.closingDate)}</td><td className="max-w-48 px-4 py-4">{record.closedItem}</td><td className="px-4 py-4">{campaigns.find(c => c.id === record.campaignId)?.name ?? "Sem campanha"}</td><td className="px-4 py-4">{statusLabel[record.internalStatus]}</td><td className="px-4 py-4 font-semibold text-[#2e7da3]">{money.format(Number(record.value))}</td><td className="sticky right-0 z-[5] bg-white px-4 py-4"><div className="flex gap-1"><Button type="button" size="sm" variant="outline" onClick={() => confirmDelete(record.id)} disabled={deletePatient.isPending} className="text-[#a14f4f]"><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div></td></tr>)}</tbody></table></div><TablePagination page={paginated.page} totalItems={paginated.totalItems} label="pacientes" onPageChange={setPage} /></Card>

    <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}><DialogContent className="bg-white sm:max-w-xl"><DialogHeader><DialogTitle>{editingCampaignId ? "Corrigir campanha" : "Inscrever campanha"} · Pacientes Ativos</DialogTitle><DialogDescription>Nome, origem, datas e meta próprios. Campanhas do funil anterior não aparecem aqui.</DialogDescription></DialogHeader><form onSubmit={submitCampaign} className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome da campanha"><Input value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} required /></Field></div><Field label="Origem"><Input value={campaignForm.origin} onChange={e => setCampaignForm({ ...campaignForm, origin: e.target.value })} required placeholder="Instagram, indicação..." /></Field><Field label="Meta semanal (R$) · opcional"><Input value={campaignForm.weeklyGoal} onChange={e => setCampaignForm({ ...campaignForm, weeklyGoal: e.target.value.replace(/[^\d,]/g, "") })} inputMode="decimal" placeholder="A definir" /></Field><Field label="Início"><Input type="date" value={campaignForm.startDate} onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })} required /></Field><Field label="Fim · opcional"><Input type="date" value={campaignForm.endDate} onChange={e => setCampaignForm({ ...campaignForm, endDate: e.target.value })} /></Field><DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={createCampaign.isPending || updateCampaign.isPending} className="bg-[#2e7da3] hover:bg-[#246989]">Salvar campanha</Button></DialogFooter></form></DialogContent></Dialog>
  </div></div></DashboardLayout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">{label}{children}</label>; }
