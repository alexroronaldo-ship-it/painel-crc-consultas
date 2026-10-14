import { CLINIC_REFERENCE_OPTIONS, ORTHO_TREATMENTS } from "@shared/orthoReference";
import DashboardLayout from "@/components/DashboardLayout";
import OrtoCrcManagement from "@/components/OrtoCrcManagement";
import OrthoActiveCrcPanel from "@/components/OrthoActiveCrcPanel";
import { ActiveOriginDashboards, ActiveWeeklyChart } from "@/components/OrthoActiveCharts";
import TablePagination from "@/components/TablePagination";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_CRC_LABELS, calculateActiveMetrics, type ActiveCrcName } from "@/lib/ortho-active";
import { paginateItems } from "@/lib/pagination";
import { trpc } from "@/lib/trpc";
import { Check, DollarSign, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const names = Object.keys(ACTIVE_CRC_LABELS) as ActiveCrcName[];
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateDisplay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);

type Treatment = (typeof ORTHO_TREATMENTS)[number];
type Reference = (typeof CLINIC_REFERENCE_OPTIONS)[number];

export default function OrthoActive() {
  const { user } = useAuth();
  const [selectedCrcId, setSelectedCrcId] = useState("WISLLAYNI");
  const [month, setMonth] = useState(currentMonth);
  const [crcName, setCrcName] = useState<ActiveCrcName | "">("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactChannel, setContactChannel] = useState<"WhatsApp" | "Ligação" | "Presencial" | "Instagram" | "">("");
  const [reference, setReference] = useState<Reference | "">("");
  const [closingDate, setClosingDate] = useState("");
  const [closedItem, setClosedItem] = useState<Treatment | "">("");
  const [value, setValue] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();
  const teamQuery = trpc.crcTransfers.ortoList.useQuery({ scope: "ortho_active" });
  const team = teamQuery.data ?? [];
  const activeTeam = team.filter(crc => crc.isActive);
  const selectedCrc = team.find(crc => crc.id === selectedCrcId) ?? activeTeam[0];
  const readOnly = selectedCrc?.isActive === false;
  const queryInput = useMemo(() => ({ month: month || undefined }), [month]);
  const patientsQuery = trpc.orthoActive.patients.list.useQuery(queryInput);
  const profilesQuery = trpc.crcProfiles.list.useQuery();
  const goalsQuery = trpc.orthoActive.goals.list.useQuery({ month: month || currentMonth }, { enabled: Boolean(month) });
  const weeksQuery = trpc.orthoActive.weekly.list.useQuery({ month: month || currentMonth }, { enabled: Boolean(month) });
  const patients = (patientsQuery.data ?? []).filter(item => names.includes(item.crcName as ActiveCrcName));
  const metrics = calculateActiveMetrics(patients);

  const selectCrc = (id: string) => { setSelectedCrcId(id); setCrcName(""); setPage(1); };
  useEffect(() => { if (crcName && !activeTeam.some(crc => crc.id === crcName)) setCrcName(""); }, [teamQuery.data, crcName]);
  const createPatient = trpc.orthoActive.patients.create.useMutation({
    onSuccess: async (_result, input) => { setMonth(input.closingDate.slice(0, 7)); setPage(1); await utils.orthoActive.patients.list.invalidate(); setPatientName(""); setPhone(""); setContactChannel(""); setReference(""); setClosingDate(""); setClosedItem(""); setValue(""); setInternalNotes(""); toast.success("Paciente interno registrado com sucesso"); },
    onError: error => toast.error(error.message),
  });
  const deletePatient = trpc.orthoActive.patients.deleteOne.useMutation({ onSuccess: async () => { await utils.orthoActive.patients.list.invalidate(); toast.success("Registro excluído"); }, onError: error => toast.error(error.message) });
  const filtered = useMemo(() => { const term = search.trim().toLocaleLowerCase("pt-BR"); return term ? patients.filter(item => `${item.patientName} ${item.phone} ${item.crcName} ${item.closedItem} ${item.contactChannel ?? ""} ${item.reference ?? ""}`.toLocaleLowerCase("pt-BR").includes(term)) : patients; }, [patients, search]);
  const paginated = paginateItems(filtered, page);
  const submitPatient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!crcName || !activeTeam.some(crc => crc.id === crcName)) return toast.error("Selecione uma CRC ativa");
    if (!contactChannel) return toast.error("Selecione o canal de contato");
    if (!reference) return toast.error("Selecione a referência");
    if (!closedItem) return toast.error("Selecione o tratamento fechado");
    if (internalNotes.trim().length < 2) return toast.error("Informe uma observação interna");
    createPatient.mutate({ crcName, patientName, phone, contactChannel, reference, closingDate, closedItem, value, internalStatus: "closed", internalNotes });
  };
  const confirmDelete = (id: number) => {
    if (!window.confirm("Excluir apenas este paciente da Comissão Clínica? Esta ação não pode ser desfeita.")) return;
    const password = window.prompt("Digite a senha provisória para excluir este registro:");
    if (password !== null) deletePatient.mutate({ id, password });
  };

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><img src="/manus-storage/ortoimplante-logo-new_f9d1ae47.png" alt="Orto Implante" className="mb-4 h-20 w-auto max-w-full object-contain object-left sm:h-24" /><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Comissão Clínica – Ortoimplant</h1><p className="mt-1 text-sm text-[#6e7f88]">Pacientes internos e indicados, com referências e metas próprias · sem registro de campanha.</p></div><div><label htmlFor="active-period" className="mb-1 block text-xs font-semibold uppercase text-[#6e7f88]">Período</label><div className="flex gap-2"><Input id="active-period" type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }} className="w-44 bg-white" /><Button type="button" variant="outline" className="bg-white" onClick={() => { setMonth(""); setPage(1); }}>Todo período</Button></div></div></header>
    <Card className="border-[#cddfe8] bg-white shadow-sm"><CardContent className="flex items-center justify-between gap-4 p-6"><div><p className="text-sm text-[#6e7f88]">Vendas fechadas · Comissão Clínica</p><p className="mt-2 text-3xl font-semibold text-[#174f6f]">{money.format(metrics.revenue)}</p><p className="mt-1 text-xs text-[#8b989d]">{metrics.closedCount} fechamentos neste período · pacientes internos e indicados</p></div><div className="rounded-2xl bg-[#e5f1f6] p-3 text-[#2e7da3]"><DollarSign className="h-6 w-6" /></div></CardContent></Card>
    {patientsQuery.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar pacientes: {patientsQuery.error.message}</p>}
    <OrtoCrcManagement scope="ortho_active" crcs={team} selectedId={selectedCrc?.id ?? ""} onSelect={selectCrc} />
    {teamQuery.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar a equipe: {teamQuery.error.message}</p>}
    {selectedCrc && readOnly && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Histórico de {selectedCrc.name} · retirada somente da Comissão Clínica. Metas, tarefas e agendamentos anteriores preservados.</p>}
    {selectedCrc ? <Tabs value={selectedCrc.id} onValueChange={selectCrc}><TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-[#e8f0f4] p-1">{names.filter(name => activeTeam.some(crc => crc.id === name)).map(name => <TabsTrigger key={name} value={name} className="rounded-lg py-2.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#1f6f96]"><span aria-hidden="true" className="mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dceaf0] text-xs text-[#2e718f]">{profilesQuery.data?.find(profile => profile.crcName === name)?.photoUrl ? <img src={profilesQuery.data.find(profile => profile.crcName === name)!.photoUrl} alt="" className="h-full w-full object-cover object-top" /> : ACTIVE_CRC_LABELS[name].slice(0, 1)}</span>{ACTIVE_CRC_LABELS[name]}</TabsTrigger>)}</TabsList>{names.map(name => <TabsContent key={name} value={name} className="mt-4"><OrthoActiveCrcPanel crcName={name} month={month} records={patients} goals={goalsQuery.data ?? []} weekly={weeksQuery.data ?? []} isAdmin={user?.role === "admin"} readOnly={readOnly} photoUrl={profilesQuery.data?.find(profile => profile.crcName === name)?.photoUrl} /></TabsContent>)}</Tabs> : <p className="text-sm text-[#617782]">{teamQuery.isLoading ? "Carregando equipe..." : "Nenhuma CRC ativa nesta página. Reative uma profissional para registrar pacientes."}</p>}
    <ActiveOriginDashboards records={patients} />
    {activeTeam.length > 0 && <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-[#174f6f]"><Plus className="h-5 w-5 text-[#2e7da3]" />Novo registro de paciente interno</CardTitle><p className="text-xs text-[#7d8d95]">Todos os campos são obrigatórios; registre somente pacientes fechados, internos ou indicados.</p></CardHeader><CardContent><form onSubmit={submitPatient} className="grid gap-3 md:grid-cols-4"><Field label="Nome do CRC"><select value={crcName} onChange={e => setCrcName(e.target.value as ActiveCrcName | "")} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Selecionar</option>{activeTeam.map(crc => <option key={crc.id} value={crc.id}>{crc.name}</option>)}</select></Field><Field label="Nome do paciente"><Input value={patientName} onChange={e => setPatientName(e.target.value)} required placeholder="Nome completo" /></Field><Field label="Telefone"><Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required placeholder="(11) 99999-0000" /></Field><Field label="Canal de contato"><select value={contactChannel} onChange={e => setContactChannel(e.target.value as typeof contactChannel)} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Selecionar</option><option value="WhatsApp">WhatsApp</option><option value="Ligação">Ligação</option><option value="Presencial">Presencial</option><option value="Instagram">Instagram</option></select></Field><Field label="Referência"><select value={reference} onChange={e => setReference(e.target.value as typeof reference)} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Selecionar referência</option>{CLINIC_REFERENCE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></Field><Field label="Data que fechou"><Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} required /></Field><Field label="O que fechou"><select value={closedItem} onChange={e => setClosedItem(e.target.value as Treatment | "")} required className="h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"><option value="">Selecionar tratamento</option>{ORTHO_TREATMENTS.map(treatment => <option key={treatment} value={treatment}>{treatment}</option>)}</select></Field><Field label="Valor (R$)"><Input value={value} onChange={e => setValue(e.target.value.replace(/[^\d,]/g, ""))} required inputMode="decimal" placeholder="0,00" /></Field><Field label="Status do paciente"><Input value="Fechado" readOnly aria-readonly="true" className="bg-[#f4faf4] font-semibold text-[#2f7b40]" /></Field><div className="md:col-span-2"><Field label="Motivo / observação interna *"><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} required minLength={2} placeholder="Contexto do atendimento" className="min-h-10 resize-none" /></Field></div><div className="flex items-end"><Button type="submit" disabled={createPatient.isPending} className="h-10 w-full bg-[#2e7da3] hover:bg-[#246989]">{createPatient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Adicionar</>}</Button></div></form></CardContent></Card>}
    <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-[#e3edf1] p-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#174f6f]">Registros de pacientes internos</h2><p className="text-xs text-[#7d8d95]">Cinco por página · exclusão individual protegida por senha.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa1aa]" /><Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar paciente, CRC, referência" className="h-9 pl-9" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1300px] text-left text-sm"><thead className="bg-[#f7fafb] text-xs uppercase text-[#617782]"><tr>{["CRC", "Paciente", "Telefone", "Canal", "Referência", "Fechamento", "Tratamento", "Status", "Valor"].map(item => <th key={item} className="px-4 py-3">{item}</th>)}<th className="sticky right-0 z-10 bg-[#f7fafb] px-4 py-3">Ações</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{patientsQuery.isLoading ? <tr><td colSpan={10} className="py-10 text-center text-[#617782]">Carregando registros...</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="py-10 text-center text-[#617782]">Nenhum paciente registrado neste período.</td></tr> : paginated.items.map(record => <tr key={record.id} className="hover:bg-[#fbfdfe]"><td className="px-4 py-4 font-medium">{ACTIVE_CRC_LABELS[record.crcName as ActiveCrcName] ?? record.crcName}</td><td className="px-4 py-4 font-semibold text-[#174f6f]">{record.patientName}</td><td className="px-4 py-4">{record.phone}</td><td className="px-4 py-4">{record.contactChannel ?? "Não informado"}</td><td className="max-w-48 px-4 py-4">{record.reference ?? "Não informado"}</td><td className="px-4 py-4">{dateDisplay(record.closingDate)}</td><td className="max-w-48 px-4 py-4">{record.closedItem}</td><td className="px-4 py-4">Fechado</td><td className="px-4 py-4 font-semibold text-[#2e7da3]">{money.format(Number(record.value))}</td><td className="sticky right-0 z-[5] bg-white px-4 py-4"><Button type="button" size="sm" variant="outline" onClick={() => confirmDelete(record.id)} disabled={deletePatient.isPending} className="text-[#a14f4f]"><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></td></tr>)}</tbody></table></div><TablePagination page={paginated.page} totalItems={paginated.totalItems} label="pacientes" onPageChange={setPage} /></Card>
  </div></div></DashboardLayout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">{label}{children}</label>; }
