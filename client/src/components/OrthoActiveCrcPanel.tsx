import CrcPortraitCard from "@/components/CrcPortraitCard";
import { ActiveWeeklyChart } from "@/components/OrthoActiveCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_CRC_LABELS, calculateActiveMetrics, type ActiveCrcName } from "@/lib/ortho-active";
import { trpc } from "@/lib/trpc";
import { Pencil, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type RecordRow = { crcName: string; closingDate: string; value: string; totalTimeSeconds: number; internalStatus: string; campaignId: number | null };
type GoalRow = { crcName: string; monthlyGoal: string | null; weeklySalesGoal: string | null; timeGoalSeconds: number | null };
type WeekRow = { crcName: string; week: number; taskCount: number; taskGoal: number | null; description: string | null; appointmentCount: number; appointmentGoal: number | null };
const weeks = [1, 2, 3, 4, 5] as const;
const pct = (actual: number, target: number) => Math.min(100, actual / target * 100);
const moneyInput = (value: string) => value.replace(/[^\d,]/g, "");

export default function OrthoActiveCrcPanel({ crcName, month, records, goals, weekly, isAdmin, photoUrl, readOnly = false }: { crcName: ActiveCrcName; month: string; records: RecordRow[]; goals: GoalRow[]; weekly: WeekRow[]; isAdmin: boolean; photoUrl?: string; readOnly?: boolean }) {
  const label = ACTIVE_CRC_LABELS[crcName];
  const goal = goals.find(item => item.crcName === crcName);
  const monthlyGoal = goal?.monthlyGoal ? Number(goal.monthlyGoal) : null;
  const weeklySalesGoal = goal?.weeklySalesGoal ? Number(goal.weeklySalesGoal) : null;
  const own = records.filter(item => item.crcName === crcName);
  const metrics = calculateActiveMetrics(own);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalMonth, setGoalMonth] = useState("");
  const [goalWeekly, setGoalWeekly] = useState("");
  const [weeklyMode, setWeeklyMode] = useState<"tasks" | "appointments" | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [weeklyCount, setWeeklyCount] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();
  const saveGoal = trpc.orthoActive.goals.save.useMutation({
    onSuccess: async () => { await utils.orthoActive.goals.list.invalidate(); setGoalOpen(false); toast.success(`Metas de ${label} salvas`); }, onError: error => toast.error(error.message),
  });
  const saveTasks = trpc.orthoActive.weekly.saveTasks.useMutation({
    onSuccess: async () => { await utils.orthoActive.weekly.list.invalidate(); setWeeklyMode(null); toast.success("Tarefas semanais salvas"); }, onError: error => toast.error(error.message),
  });
  const saveAppointments = trpc.orthoActive.weekly.saveAppointments.useMutation({
    onSuccess: async () => { await utils.orthoActive.weekly.list.invalidate(); setWeeklyMode(null); toast.success("Agendamentos semanais salvos"); }, onError: error => toast.error(error.message),
  });
  const openGoal = () => {
    if (readOnly) return;
    if (!month) return toast.error("Selecione um mês antes de definir metas");
    setGoalMonth(goal?.monthlyGoal?.replace(".", ",") ?? "");
    setGoalWeekly(goal?.weeklySalesGoal?.replace(".", ",") ?? "");
    setGoalOpen(true);
  };
  const openWeek = (mode: "tasks" | "appointments", week: number) => {
    if (readOnly) return;
    if (!month) return toast.error("Selecione um mês antes de registrar a semana");
    const existing = weekly.find(item => item.crcName === crcName && item.week === week);
    setSelectedWeek(week); setWeeklyMode(mode);
    setWeeklyCount(existing ? String(mode === "tasks" ? existing.taskCount : existing.appointmentCount) : "");
    setWeeklyTarget(existing ? String((mode === "tasks" ? existing.taskGoal : existing.appointmentGoal) ?? "") : "");
    setDescription(mode === "tasks" ? existing?.description ?? "" : "");
  };
  const submitGoal = (event: React.FormEvent) => {
    event.preventDefault();
    saveGoal.mutate({ crcName, month, monthlyGoal: goalMonth || undefined, weeklySalesGoal: goalWeekly || undefined });
  };
  const submitWeekly = (event: React.FormEvent) => {
    event.preventDefault();
    const count = Number(weeklyCount), target = weeklyTarget ? Number(weeklyTarget) : undefined;
    if (!Number.isInteger(count) || count < 0 || (target !== undefined && (!Number.isInteger(target) || target < 1))) return toast.error("Informe quantidades semanais válidas");
    if (weeklyMode === "tasks") saveTasks.mutate({ crcName, month, week: selectedWeek, taskCount: count, taskGoal: target, description: description || undefined });
    if (weeklyMode === "appointments") saveAppointments.mutate({ crcName, month, week: selectedWeek, appointmentCount: count, appointmentGoal: target });
  };

  return <div className="space-y-5">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,320px)]">
      <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Vendas · ${label}`} value={money.format(metrics.revenue)} detail={`${metrics.closedCount} fechamentos neste módulo`} />
        <Stat label="Meta mensal própria" value={monthlyGoal ? money.format(monthlyGoal) : "Não definida"} detail={monthlyGoal ? metrics.revenue >= monthlyGoal ? `Meta superada em ${money.format(metrics.revenue - monthlyGoal)}` : `Faltam ${money.format(monthlyGoal - metrics.revenue)}` : "Configure sem afetar o Funil de Vendas"} />
        <Stat label="Pacientes registrados" value={String(metrics.count)} detail="Somente Wisllayny e JAYZA" />
      </div>
      <Card className="border-[#cddfe8] bg-white shadow-sm"><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base text-[#174f6f]"><Target className="h-4 w-4 text-[#b4a92f]" />Metas de {label}</CardTitle>{isAdmin && !readOnly && <Button type="button" variant="outline" size="sm" onClick={openGoal} disabled={!month || readOnly}><Pencil className="mr-1.5 h-3.5 w-3.5" />Configurar</Button>}</div></CardHeader><CardContent className="space-y-4"><div><div className="flex justify-between gap-2 text-xs text-[#6e7f88]"><span>Faturamento mensal</span><span>{monthlyGoal ? money.format(monthlyGoal) : "A definir"}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e3eef2]"><div className="h-full bg-[#2e7da3]" style={{ width: `${monthlyGoal ? pct(metrics.revenue, monthlyGoal) : 0}%` }} /></div></div><p className="text-xs text-[#6e7f88]">Meta semanal de vendas: <strong className="text-[#174f6f]">{weeklySalesGoal ? money.format(weeklySalesGoal) : "a definir"}</strong></p><p className="text-xs text-[#6e7f88]">Valores independentes das metas e comissões da página anterior.</p></CardContent></Card></div>
      <div className="space-y-2"><CrcPortraitCard fillHeight={false} crcName={crcName} displayName={label} commission={metrics.commission} month={month} photoUrl={photoUrl} readOnly={readOnly} /><p className="px-1 text-[11px] text-[#7d8d95]">Foto profissional compartilhada com o Funil de Vendas. A comissão de 0,2% considera somente os fechamentos de Pacientes Ativos desta CRC.</p></div>
    </div>

    <section><ActiveWeeklyChart records={own} month={month} weeklyGoal={weeklySalesGoal} title={`Vendas semanais · ${label}`} /></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-[#d8e5eb] bg-white shadow-sm lg:col-span-1"><CardHeader><CardTitle className="text-base text-[#174f6f]">Tarefas · S1–S5</CardTitle><p className="text-xs text-[#7d8d95]">Meta editável por semana · {label}</p></CardHeader><CardContent className="space-y-2">{weeks.map(week => { const row = weekly.find(item => item.crcName === crcName && item.week === week); return <WeekButton key={week} title={`S${week}`} amount={row?.taskCount ?? null} target={row?.taskGoal ?? null} description={row?.description} onClick={() => openWeek("tasks", week)} disabled={!month || readOnly} />; })}</CardContent></Card>
      <Card className="border-[#d8e5eb] bg-white shadow-sm lg:col-span-1"><CardHeader><CardTitle className="text-base text-[#174f6f]">Agendamentos · S1–S5</CardTitle><p className="text-xs text-[#7d8d95]">Meta editável por semana · {label}</p></CardHeader><CardContent className="space-y-2">{weeks.map(week => { const row = weekly.find(item => item.crcName === crcName && item.week === week); return <WeekButton key={week} title={`S${week}`} amount={row?.appointmentCount ?? null} target={row?.appointmentGoal ?? null} onClick={() => openWeek("appointments", week)} disabled={!month || readOnly} />; })}</CardContent></Card>
    </div>

    <Dialog open={goalOpen} onOpenChange={setGoalOpen}><DialogContent className="bg-white sm:max-w-lg"><DialogHeader><DialogTitle>Metas próprias · {label}</DialogTitle><DialogDescription>Metas do mês selecionado, sem alterar o Comissão Marketing – Ortoimplante. Deixe vazio para não definir uma meta.</DialogDescription></DialogHeader><form onSubmit={submitGoal} className="space-y-4"><Field label="Meta mensal de vendas (R$)"><Input value={goalMonth} onChange={e => setGoalMonth(moneyInput(e.target.value))} placeholder="Ex.: 30000,00" inputMode="decimal" /></Field><Field label="Meta semanal de vendas (R$)"><Input value={goalWeekly} onChange={e => setGoalWeekly(moneyInput(e.target.value))} placeholder="Ex.: 7500,00" inputMode="decimal" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => setGoalOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveGoal.isPending}>Salvar metas</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={weeklyMode !== null} onOpenChange={open => { if (!open) setWeeklyMode(null); }}><DialogContent className="bg-white sm:max-w-lg"><DialogHeader><DialogTitle>{weeklyMode === "tasks" ? "Tarefas realizadas" : "Agendamentos realizados"} · {label} · S{selectedWeek}</DialogTitle><DialogDescription>Registre os dados desta semana somente na página Pacientes Ativos. Meta opcional e independente.</DialogDescription></DialogHeader><form onSubmit={submitWeekly} className="space-y-4"><Field label="Quantidade realizada"><Input type="number" min="0" step="1" value={weeklyCount} onChange={e => setWeeklyCount(e.target.value)} required /></Field><Field label="Meta desta semana (opcional)"><Input type="number" min="1" step="1" value={weeklyTarget} onChange={e => setWeeklyTarget(e.target.value)} placeholder="Defina uma meta diferente por semana" /></Field>{weeklyMode === "tasks" && <Field label="Tarefas realizadas"><Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-24" placeholder="Descritivo das atividades" /></Field>}<DialogFooter><Button type="button" variant="outline" onClick={() => setWeeklyMode(null)}>Cancelar</Button><Button type="submit" disabled={saveTasks.isPending || saveAppointments.isPending}>Salvar semana</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) { return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><p className="text-sm text-[#6e7f88]">{label}</p><p className="mt-3 break-words text-2xl font-semibold text-[#174f6f]">{value}</p><p className="mt-1 text-xs text-[#8b989d]">{detail}</p></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">{label}{children}</label>; }
function WeekButton({ title, amount, target, description, onClick, disabled }: { title: string; amount: number | null; target: number | null; description?: string | null; onClick: () => void; disabled: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className="w-full rounded-lg border border-[#dce8ed] bg-[#fbfdfe] p-3 text-left text-xs transition-colors hover:bg-[#eaf4f8] disabled:cursor-not-allowed disabled:opacity-60"><div className="flex items-center justify-between gap-2"><span className="font-bold text-[#174f6f]">{title} · {amount === null ? "Aguardando registro" : `${amount} realizados`}</span><span className="text-[#2e7da3]">{amount === null ? "+" : <Pencil className="h-3.5 w-3.5" />}</span></div><div className="mt-1 text-[#7d8d95]">{target ? amount !== null ? amount >= target ? `Meta ${target} atingida · +${amount - target}` : `Meta ${target} · faltam ${target - amount}` : `Meta: ${target}` : "Meta ainda não definida"}</div>{target && amount !== null ? <div className="mt-2 h-1.5 rounded-full bg-[#dce8ed]"><div className="h-full rounded-full bg-[#2e7da3]" style={{ width: `${pct(amount, target)}%` }} /></div> : null}{description && <div className="mt-1 line-clamp-1 text-[#617782]">{description}</div>}</button>; }
