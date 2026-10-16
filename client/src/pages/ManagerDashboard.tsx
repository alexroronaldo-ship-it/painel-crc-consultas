import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { averageManagerScores, calculateManagerScore, MANAGER_MAX_POINTS, MANAGER_TOTAL_SALES_GOAL, type ManagerScore } from "@shared/manager-quality";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, CheckCircle2, CircleHelp, History, LockKeyhole, LogOut, ShieldCheck, Target, UnlockKeyhole } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number) => `${Math.round(value)}%`;
const points = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const displayCrc = (value: string) => value === "WISLLAYNI" ? "Wisllayny" : value === "VAL" ? "Vivi" : value;
const moduleLabels = { marketing: "Comissão Marketing", ortho: "Comissão Clínica", odontomab: "Comissão de Vendas" } as const;
const auditModuleLabels: Record<string, string> = { marketing: "Comissão Marketing", clinic: "Comissão Clínica", odontomab: "Comissão de Vendas", patient_follow_up: "Acompanhamento" };
const auditActionLabels: Record<string, string> = { created: "Inserido", updated: "Trabalhado / corrigido", deleted: "Deletado", effective: "Efetivado" };
type ModuleKey = keyof typeof moduleLabels;

type ScoreCard = { key: string; module: ModuleKey; moduleLabel: string; crcId: string; crcName: string; score: ManagerScore };

export default function ManagerDashboard() {
  const [month, setMonth] = useState(currentMonth);
  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState("");
  const [locked, setLocked] = useState(true);
  const query = trpc.manager.dashboard.useQuery({ month, password: submittedPassword }, { enabled: Boolean(submittedPassword) && !locked });
  const data = query.data;
  const cards = useMemo(() => data ? buildCards(data) : [], [data]);
  const moduleScores = useMemo(() => (Object.keys(moduleLabels) as ModuleKey[]).map(module => averageManagerScores(cards.filter(card => card.module === module).map(card => card.score))), [cards]);
  const overall = useMemo(() => data ? buildOverallScore(data, cards) : averageManagerScores(moduleScores), [data, cards, moduleScores]);
  const chartData = useMemo(() => moduleScores.map((score, index) => ({ name: ["Marketing", "Clínica", "Odontomab"][index], pontos: score.totalPoints, faltam: score.remainingPoints })), [moduleScores]);
  const periodLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.trim().length < 1) return toast.error("Informe a senha da gerente");
    setSubmittedPassword(password);
    setLocked(false);
  };
  const lock = () => {
    setLocked(true);
    setSubmittedPassword("");
    setPassword("");
  };

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e5f1f6] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#2e718f]"><ShieldCheck className="h-4 w-4" />Área reservada da gerente</div><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Painel da Gerente</h1><p className="mt-1 max-w-2xl text-sm text-[#6e7f88]">Pontuação mensal consolidada das três páginas, com visão individual de cada CRC.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div><label htmlFor="manager-period" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Período da apuração</label><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#b4a92f]" /><Input id="manager-period" type="month" value={month} onChange={event => setMonth(event.target.value)} className="h-9 w-44 border-[#d7e5ec] bg-white" /></div></div>{data && <Button type="button" variant="outline" onClick={lock} className="h-9 border-[#d7e5ec] bg-white text-[#486a7b]"><LogOut className="mr-2 h-4 w-4" />Bloquear</Button>}</div></header>

    {locked || !data ? <UnlockCard password={password} setPassword={setPassword} onSubmit={unlock} isLoading={query.isLoading} error={query.error?.message} /> : <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#dce8ed] bg-white px-4 py-3 text-sm"><div className="flex items-center gap-2 text-[#486a7b]"><UnlockKeyhole className="h-4 w-4 text-[#3f8750]" /><span>Dados liberados para <strong className="capitalize text-[#174f6f]">{periodLabel}</strong></span></div><span className="text-xs text-[#7d8d95]">Atualização protegida por senha</span></div>
      <section className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Pontuação consolidada" value={`${points(overall.totalPoints)} / 100`} detail={overall.remainingPoints ? `Faltam ${points(overall.remainingPoints)} pontos` : "Meta global atingida"} tone="blue" icon={<Target className="h-5 w-5" />} /><SummaryCard label="Valor gerado nas três páginas" value={money.format(overall.revenue)} detail={`Meta de vendas da gerente: ${money.format(MANAGER_TOTAL_SALES_GOAL)}`} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} /><SummaryCard label="Indicadores acompanhados" value={`${cards.length} CRCs`} detail="Marketing, Clínica e Odontomab" tone="yellow" icon={<ShieldCheck className="h-5 w-5" />} /></section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]"><Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2e7da3]">Resumo da pontuação da gerente</p><CardTitle className="mt-1 text-lg text-[#174f6f]">Distribuição dos 100 pontos</CardTitle><p className="mt-1 text-xs text-[#8b989d]">A pontuação consolidada usa a meta única de {money.format(MANAGER_TOTAL_SALES_GOAL)} em vendas nas três páginas.</p></div><span className="text-sm font-semibold text-[#486a7b]">{points(overall.totalPoints)} / 100</span></div></CardHeader><CardContent className="p-5"><StackedScore score={overall} /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categoryRows(overall).map(row => <div key={row.key} className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} /><CategoryLabel row={row} /></div><p className="mt-2 text-lg font-semibold text-[#174f6f]">{points(row.points)} / {row.max}</p><p className="text-[11px] text-[#8b989d]">{percent(row.percent)} da meta</p></div>)}</div><div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#f4f7f8] px-4 py-3 text-sm"><span className="text-[#617782]">Pontos que faltam para 100</span><strong className="text-[#174f6f]">{points(overall.remainingPoints)}</strong></div></CardContent></Card><Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="text-lg text-[#174f6f]">Pontuação por página</CardTitle><p className="text-xs text-[#8b989d]">Comparativo individual das três empresas/páginas do painel.</p></CardHeader><CardContent className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4edf1" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#617782" }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8b989d" }} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(value: number) => [`${points(value)} pontos`, "Pontuação"]} contentStyle={{ borderRadius: 12, borderColor: "#d8e5eb", fontSize: 12 }} /><Bar dataKey="pontos" radius={[8, 8, 0, 0]}>{chartData.map((_, index) => <Cell key={index} fill={["#2e6fa8", "#58a96b", "#b4a92f"][index]} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card></section>

      <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="text-lg text-[#174f6f]">Desempenho por CRC</CardTitle><p className="text-xs text-[#8b989d]">Cada linha mostra vendas/meta, tarefas/meta, respostas ≤2 min, agendamentos/meta e qualidade dos registros.</p></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="border-y border-[#e5edf1] bg-[#f7fafb] text-xs text-[#6e7f88]"><tr><th className="px-4 py-3">Página / CRC</th><th className="px-4 py-3">Vendas / meta</th><th className="px-4 py-3">Tarefas / meta</th><th className="px-4 py-3">Respostas ≤2 min</th><th className="px-4 py-3">Agendamentos / meta</th><th className="px-4 py-3">Qualidade</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{cards.map(card => <tr key={card.key} className="hover:bg-[#fbfdfe]"><td className="px-4 py-4"><p className="font-semibold text-[#174f6f]">{card.moduleLabel}</p><p className="text-xs text-[#7d8d95]">{card.crcName}</p></td><td className="px-4 py-4"><ScoreCell points={card.score.categories.sales.points} percent={card.score.categories.sales.percent} detail={card.score.salesGoal ? `${money.format(card.score.revenue)} / ${money.format(card.score.salesGoal)}` : "Meta não definida"} /></td><td className="px-4 py-4"><ScoreCell points={card.score.categories.tasks.points} percent={card.score.categories.tasks.percent} detail={`${card.score.validTasks} / ${card.score.taskGoal} tarefas`} /></td><td className="px-4 py-4"><ScoreCell points={card.score.categories.responses.points} percent={card.score.categories.responses.percent} detail={card.score.responseApplicable ? `${card.score.fastResponses} / ${card.score.measuredResponses} rápidas` : "Não se aplica nesta página"} /></td><td className="px-4 py-4"><ScoreCell points={card.score.categories.appointments.points} percent={card.score.categories.appointments.percent} detail={card.score.appointmentGoal ? `${card.score.appointmentCount} / ${card.score.appointmentGoal}` : "Meta não definida"} /></td><td className="px-4 py-4"><ScoreCell points={card.score.categories.records.points} percent={card.score.categories.records.percent} detail={`${card.score.validRecords} / ${card.score.recordCount} registros válidos`} /></td><td className="px-4 py-4 text-right"><span className="rounded-full bg-[#eaf4f8] px-3 py-1.5 font-bold text-[#176187]">{points(card.score.totalPoints)}</span></td></tr>)}</tbody></table></div></CardContent></Card>

      <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><div className="flex items-start gap-3"><div className="rounded-xl bg-[#e5f1f6] p-3 text-[#2e718f]"><History className="h-5 w-5" /></div><div><CardTitle className="text-lg text-[#174f6f]">Histórico de inscrições e alterações</CardTitle><p className="mt-1 text-xs text-[#8b989d]">Últimas ações do período: o que foi inserido, trabalhado, efetivado ou deletado e qual usuário realizou a ação.</p></div></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y border-[#e5edf1] bg-[#f7fafb] text-xs text-[#6e7f88]"><tr><th className="px-4 py-3">Data e hora</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Página</th><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">CRC</th><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Detalhe</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{!data.audit.length ? <tr><td colSpan={7} className="py-10 text-center text-sm text-[#7d8d95]">Nenhuma ação registrada neste período.</td></tr> : data.audit.map(log => <tr key={log.id} className="hover:bg-[#fbfdfe]"><td className="whitespace-nowrap px-4 py-4 text-xs text-[#617782]">{new Date(log.occurredAt).toLocaleString("pt-BR")}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.action === "deleted" ? "bg-[#fff0f0] text-[#a14f4f]" : log.action === "effective" ? "bg-[#eaf7ed] text-[#2f7b40]" : log.action === "updated" ? "bg-[#fff8e5] text-[#8b6720]" : "bg-[#e5f1f6] text-[#2e718f]"}`}>{auditActionLabels[log.action] ?? log.action}</span></td><td className="px-4 py-4 text-xs font-semibold text-[#486a7b]">{auditModuleLabels[log.module] ?? log.module}</td><td className="px-4 py-4 font-semibold text-[#174f6f]">{log.patientName ?? "—"}</td><td className="px-4 py-4">{log.crcName === "WISLLAYNI" ? "Wisllayny" : log.crcName ?? "—"}</td><td className="px-4 py-4">{log.performedByName}</td><td className="min-w-64 px-4 py-4 text-xs text-[#617782]">{log.summary}</td></tr>)}</tbody></table></div></CardContent></Card>

      <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="text-lg text-[#174f6f]">Como a gerente é pontuada</CardTitle><p className="text-xs text-[#8b989d]">A regra usa apenas dados fechados do período. Clique ou passe o mouse no “?” para entender cada critério.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categoryRows(overall).map(row => <div key={row.key} className="rounded-xl border border-[#dce8ed] p-4"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} /><span className="text-sm font-semibold text-[#174f6f]"><CategoryLabel row={row} /></span></div><p className="mt-2 text-xs text-[#617782]">Máximo: <strong>{row.max} pontos</strong></p><p className="mt-1 text-xs text-[#617782]">Obtidos: <strong>{points(row.points)}</strong></p><p className="mt-1 text-xs text-[#617782]">Faltam: <strong>{points(Math.max(0, row.max - row.points))}</strong></p></div>)}</CardContent></Card>
    </>}
  </div></div></DashboardLayout>;
}

function UnlockCard({ password, setPassword, onSubmit, isLoading, error }: { password: string; setPassword: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; isLoading: boolean; error?: string }) {
  return <Card className="mx-auto max-w-lg border-[#d8e5eb] bg-white shadow-sm"><CardHeader className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f1f6] text-[#2e718f]"><LockKeyhole className="h-7 w-7" /></div><CardTitle className="mt-2 text-xl text-[#174f6f]">Acesso da gerente</CardTitle><p className="text-sm text-[#6e7f88]">Digite a senha para visualizar a pontuação consolidada das três páginas.</p></CardHeader><CardContent><form onSubmit={onSubmit} className="space-y-4"><div><label htmlFor="manager-password" className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Senha da gerente</label><Input id="manager-password" type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} placeholder="Digite a senha" required /></div>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<Button type="submit" disabled={isLoading} className="w-full bg-[#2e7da3] hover:bg-[#246989]"><UnlockKeyhole className="mr-2 h-4 w-4" />{isLoading ? "Validando…" : "Acessar painel"}</Button></form><p className="mt-4 text-center text-xs text-[#8b989d]">O painel bloqueia novamente quando você sair ou atualizar a página.</p></CardContent></Card>;
}

function buildCards(data: any): ScoreCard[] {
  const cards: ScoreCard[] = [];
  for (const crcId of ["WISLLAYNI", "JAYZA"]) {
    const records = data.marketing.records.filter((row: any) => row.crcName === crcId).map(normalizeRecord);
    cards.push({ key: `marketing-${crcId}`, module: "marketing", moduleLabel: moduleLabels.marketing, crcId, crcName: displayCrc(crcId), score: calculateManagerScore({ revenue: sumValues(records), salesGoal: 75_000, records, tasks: data.marketing.tasks.filter((row: any) => row.crcName === crcId), appointments: data.marketing.appointments.filter((row: any) => row.crcName === crcId) }) });
  }
  for (const crcId of ["WISLLAYNI", "JAYZA"]) {
    const records = data.ortho.records.filter((row: any) => row.crcName === crcId).map(normalizeRecord);
    const weekly = data.ortho.weekly.filter((row: any) => row.crcName === crcId);
    const goal = data.ortho.goals.find((row: any) => row.crcName === crcId)?.monthlyGoal;
    const taskGoal = weekly.length ? weekly.reduce((sum: number, row: any) => sum + (row.taskGoal ?? 100), 0) : 500;
    cards.push({ key: `ortho-${crcId}`, module: "ortho", moduleLabel: moduleLabels.ortho, crcId, crcName: displayCrc(crcId), score: calculateManagerScore({ revenue: sumValues(records), salesGoal: goal ? Number(goal) : null, records, taskGoal, responseApplicable: false, tasks: weekly.map((row: any) => ({ taskCount: row.taskCount, description: row.description })), appointments: weekly.filter((row: any) => row.appointmentGoal).map((row: any) => ({ appointmentCount: row.appointmentCount, weeklyGoal: row.appointmentGoal })) }) });
  }
  for (const crc of data.odontomab.crcs) {
    const records = data.odontomab.records.filter((row: any) => row.crcId === crc.id).map(normalizeRecord);
    cards.push({ key: `odontomab-${crc.id}`, module: "odontomab", moduleLabel: moduleLabels.odontomab, crcId: crc.id, crcName: crc.name, score: calculateManagerScore({ revenue: sumValues(records), salesGoal: 75_000, records, tasks: data.odontomab.tasks.filter((row: any) => row.crcId === crc.id), appointments: data.odontomab.appointments.filter((row: any) => row.crcId === crc.id) }) });
  }
  return cards;
}

/** Pontuação oficial da supervisora: consolida as três páginas em uma meta de vendas única. */
function buildOverallScore(data: any, cards: ScoreCard[]) {
  const records = [...data.marketing.records, ...data.ortho.records, ...data.odontomab.records].map(normalizeRecord);
  const tasks = [
    ...data.marketing.tasks,
    ...data.ortho.weekly.map((row: any) => ({ taskCount: row.taskCount, description: row.description })),
    ...data.odontomab.tasks,
  ];
  const appointments = [
    ...data.marketing.appointments,
    ...data.ortho.weekly.filter((row: any) => row.appointmentGoal).map((row: any) => ({ appointmentCount: row.appointmentCount, weeklyGoal: row.appointmentGoal })),
    ...data.odontomab.appointments,
  ];
  return calculateManagerScore({
    revenue: sumValues(records),
    salesGoal: MANAGER_TOTAL_SALES_GOAL,
    records,
    tasks,
    appointments,
    taskGoal: cards.reduce((sum, card) => sum + card.score.taskGoal, 0),
    responseApplicable: true,
  });
}

function normalizeRecord(record: any) {
  return {
    ...record,
    closingDate: record.closingDate ?? record.saleDate,
    closedItem: record.closedItem ?? record.treatment,
    internalNotes: record.internalNotes ?? record.notes,
  };
}

function sumValues(records: Array<{ value: string | number }>) { return records.reduce((sum, record) => sum + Number(record.value), 0); }

function categoryRows(score: ManagerScore) {
  return [
    { key: "sales", label: "Vendas", points: score.categories.sales.points, percent: score.categories.sales.percent, max: MANAGER_MAX_POINTS.sales, color: "#2e6fa8" },
    { key: "tasks", label: "Tarefas", points: score.categories.tasks.points, percent: score.categories.tasks.percent, max: MANAGER_MAX_POINTS.tasks, color: "#d5b52f" },
    { key: "responses", label: "Tempo de resposta", points: score.categories.responses.points, percent: score.categories.responses.percent, max: MANAGER_MAX_POINTS.responses, color: "#d46da8" },
    { key: "appointments", label: "Agendamentos", points: score.categories.appointments.points, percent: score.categories.appointments.percent, max: MANAGER_MAX_POINTS.appointments, color: "#52b8b0" },
    { key: "records", label: "Qualidade dos registros", points: score.categories.records.points, percent: score.categories.records.percent, max: MANAGER_MAX_POINTS.records, color: "#65c58a" },
  ];
}

const criteriaHelp: Record<string, string> = {
  sales: "Principal critério. Pontuação proporcional ao total vendido em relação à meta de R$ 400.000.",
  tasks: "Criação e execução de tarefas no CRM. É o que mantém os pacientes sendo trabalhados até a venda.",
  appointments: "Número de agendamentos realizados em relação à meta semanal.",
  responses: "Rapidez no primeiro retorno ao paciente.",
  records: "Registros completos e corretos, que garantem dados confiáveis para o faturamento.",
};

function CategoryLabel({ row }: { row: { key: string; label: string } }) {
  return <span className="inline-flex items-center gap-1"><span>{row.label}</span><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Ajuda sobre ${row.label}`} className="rounded-full text-[#7694a3] outline-none transition-colors hover:text-[#2e718f] focus-visible:ring-2 focus-visible:ring-[#73b0c9]"><CircleHelp className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-72 bg-[#174f6f] text-white">{criteriaHelp[row.key]}</TooltipContent></Tooltip></span>;
}

function StackedScore({ score }: { score: ManagerScore }) {
  const rows = categoryRows(score);
  return <>
    <div className="flex h-9 overflow-hidden rounded-lg bg-[#e7edf0]">
      {rows.map(row => row.points > 0 && <div key={row.key} className="flex items-center justify-center px-1 text-[11px] font-bold text-white" style={{ width: `${row.points}%`, backgroundColor: row.color }} title={`${row.label}: ${points(row.points)} pontos`}>{row.points >= 4 ? points(row.points) : ""}</div>)}
      {score.remainingPoints > 0 && <div className="flex flex-1 items-center justify-center text-[11px] font-semibold text-[#6e7f88]">{points(score.remainingPoints)} faltantes</div>}
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {rows.map(row => <div key={row.key} className="flex items-center gap-1.5 text-xs text-[#617782]"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: row.color }} /><CategoryLabel row={row} /> · {points(row.points)} / {row.max}</div>)}
    </div>
  </>;
}

function ScoreCell({ points: value, percent: ratio, detail }: { points: number; percent: number; detail: string }) {
  return <div><p className="font-semibold text-[#174f6f]">{points(value)} pts</p><p className="text-[11px] text-[#7d8d95]">{percent(ratio)} · {detail}</p></div>;
}

function SummaryCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: "blue" | "green" | "yellow"; icon: React.ReactNode }) {
  const classes = tone === "green" ? "bg-[#eef8f0] text-[#3f8750]" : tone === "yellow" ? "bg-[#fff8e5] text-[#9a6b12]" : "bg-[#e5f1f6] text-[#2e718f]";
  return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#6e7f88]">{label}</p><p className="mt-3 text-2xl font-semibold text-[#174f6f]">{value}</p><p className="mt-1 text-xs text-[#8b989d]">{detail}</p></div><div className={`rounded-xl p-3 ${classes}`}>{icon}</div></div></CardContent></Card>;
}
