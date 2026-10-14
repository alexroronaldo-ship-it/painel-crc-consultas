import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarDays, CircleDollarSign, Target, Trophy } from "lucide-react";
import { useState } from "react";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const moduleLabels: Record<string, string> = {
  marketing: "Marketing",
  clinic: "Clínica",
  odontomab: "Odontomab",
};
const colors = ["#2e6fa8", "#58a96b", "#b4a92f", "#8c6bb1", "#d46d91", "#4ca9a4"];
const formatPercent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

type CrcSalesRow = {
  id: string;
  name: string;
  totalSold: number;
  goal: number;
  percentOfGoal: number;
  remaining: number;
  surplus: number;
  saleCount: number;
  modules: string[];
};

export default function SalesByCrc() {
  const [month, setMonth] = useState<string | undefined>();
  const query = trpc.salesByCrc.summary.useQuery(month ? { month } : undefined);
  const data = query.data;
  const periodLabel = month
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`))
    : "todo o período";
  const chartMax = data ? Math.max(data.goal, ...data.rows.map(row => row.totalSold), 1) * 1.12 : 75_000;
  const totalGoal = data ? data.goal * data.totalCrcs : 0;

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e5f1f6] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#2e718f]"><BarChart3 className="h-4 w-4" />Visão financeira da equipe</div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Total vendido por CRC</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6e7f88]">Consolidado dos pacientes fechados nas páginas Marketing, Clínica e Odontomab, com meta individual de R$ 75 mil.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="sales-crc-period" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Período opcional</label>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#b4a92f]" /><Input id="sales-crc-period" type="month" value={month ?? ""} onChange={event => setMonth(event.target.value || undefined)} className="h-9 w-44 border-[#d7e5ec] bg-white" /></div>
        </div>
        <Button type="button" variant="outline" onClick={() => setMonth(undefined)} className={`h-9 border-[#d7e5ec] bg-white ${!month ? "text-[#2e7da3]" : "text-[#486a7b]"}`}>Todo período</Button>
      </div>
    </header>

    {query.isLoading && <Card className="border-[#d8e5eb] bg-white"><CardContent className="p-8 text-center text-sm text-[#617782]">Carregando totais de vendas…</CardContent></Card>}
    {query.error && <Card className="border-red-200 bg-red-50"><CardContent className="p-5 text-sm text-red-800">Não foi possível carregar o consolidado: {query.error.message}</CardContent></Card>}
    {data && <>
      <div className="flex items-center gap-2 rounded-xl border border-[#dce8ed] bg-white px-4 py-3 text-sm text-[#486a7b]"><CalendarDays className="h-4 w-4 text-[#2e7da3]" />Apuração de <strong className="capitalize text-[#174f6f]">{periodLabel}</strong><span className="text-xs text-[#8b989d]">· apenas pacientes fechados</span></div>
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total vendido no painel" value={money.format(data.totalSold)} detail={`${data.rows.reduce((sum, row) => sum + row.saleCount, 0)} vendas fechadas`} tone="blue" icon={<CircleDollarSign className="h-5 w-5" />} />
        <SummaryCard label="Meta total da equipe" value={money.format(totalGoal)} detail={`${data.totalCrcs} CRCs · R$ 75 mil por CRC`} tone="yellow" icon={<Target className="h-5 w-5" />} />
        <SummaryCard label="Maior venda acumulada" value={money.format(data.rows[0]?.totalSold ?? 0)} detail={data.rows[0] ? `${data.rows[0].name} · ${formatPercent(data.rows[0].percentOfGoal)} da meta` : "Nenhuma venda registrada"} tone="green" icon={<Trophy className="h-5 w-5" />} />
      </section>
      <SalesComparisonChart rows={data.rows} goal={data.goal} chartMax={chartMax} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.rows.map((row, index) => <CrcCard key={row.id} row={row} color={colors[index % colors.length]} />)}</section>
    </>}
  </div></div></DashboardLayout>;
}

function SalesComparisonChart({ rows, goal, chartMax }: { rows: CrcSalesRow[]; goal: number; chartMax: number }) {
  const goalPosition = Math.min(100, goal / chartMax * 100);
  return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg text-[#174f6f]">Vendas por CRC</CardTitle><p className="mt-1 text-xs text-[#8b989d]">Valor vendido acumulado em cada CRC. A linha dourada marca a meta individual de R$ 75 mil.</p></div><span className="rounded-full bg-[#fff8e5] px-3 py-1.5 text-xs font-bold text-[#8b6720]">Meta: {money.format(goal)}</span></div></CardHeader><CardContent className="space-y-5 p-5">
    <div className="relative ml-[5.75rem] h-6 border-b border-[#e1eaee] text-[10px] text-[#8b989d] sm:ml-28">
      <span className="absolute left-0 top-0">R$ 0</span>
      <span className="absolute top-0 -translate-x-1/2" style={{ left: `${goalPosition}%` }}>R$ 75 mil</span>
      <span className="absolute right-0 top-0">{compactMoney.format(chartMax)}</span>
      <span aria-hidden="true" className="absolute bottom-0 top-0 border-l-2 border-dashed border-[#b4a92f]" style={{ left: `${goalPosition}%` }} />
    </div>
    <div className="space-y-5">{rows.map((row, index) => <SalesBar key={row.id} row={row} color={colors[index % colors.length]} goalPosition={goalPosition} chartMax={chartMax} />)}</div>
    <div className="ml-[5.75rem] flex items-center gap-2 text-xs text-[#8b6720] sm:ml-28"><span className="h-4 border-l-2 border-dashed border-[#b4a92f]" />Linha de meta individual: {money.format(goal)}</div>
  </CardContent></Card>;
}

function SalesBar({ row, color, goalPosition, chartMax }: { row: CrcSalesRow; color: string; goalPosition: number; chartMax: number }) {
  const width = Math.min(100, row.totalSold / chartMax * 100);
  return <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
    <div className="flex flex-col justify-center"><p className="truncate text-sm font-semibold text-[#486a7b]">{row.name}</p><p className="text-[10px] text-[#8b989d]">{formatPercent(row.percentOfGoal)} da meta</p></div>
    <div className="relative pt-1"><div className="relative h-8 overflow-hidden rounded-r-lg bg-[#edf3f5]"><div role="img" aria-label={`${row.name}: ${money.format(row.totalSold)} vendidos`} className="h-full min-w-1 rounded-r-lg transition-[width] duration-300" style={{ width: `${width}%`, backgroundColor: color }} /></div><p className="mt-1 text-xs font-bold text-[#174f6f]">{money.format(row.totalSold)}</p><span aria-hidden="true" className="pointer-events-none absolute -top-1 bottom-0 border-l-2 border-dashed border-[#b4a92f]" style={{ left: `${goalPosition}%` }} /></div>
  </div>;
}

function CrcCard({ row, color }: { row: CrcSalesRow; color: string }) {
  const progress = Math.min(100, row.percentOfGoal);
  return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#6e7f88]">CRC</p><h2 className="mt-1 text-xl font-semibold text-[#174f6f]">{row.name}</h2></div><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} /></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs text-[#8b989d]">Total vendido</p><p className="mt-1 text-2xl font-semibold text-[#174f6f]">{money.format(row.totalSold)}</p></div><div className="text-right"><p className="text-xs text-[#8b989d]">Meta</p><p className="font-semibold text-[#486a7b]">{money.format(row.goal)}</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e7eef1]"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, backgroundColor: color }} /></div><div className="mt-2 flex justify-between text-xs"><span className="font-semibold text-[#486a7b]">{formatPercent(row.percentOfGoal)}</span><span className={row.surplus ? "font-semibold text-[#3f8750]" : "text-[#8b6720]"}>{row.surplus ? `Superávit ${money.format(row.surplus)}` : row.remaining ? `Faltam ${money.format(row.remaining)}` : "Meta atingida"}</span></div><div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-[#7d8d95]"><span>{row.saleCount} venda{row.saleCount === 1 ? "" : "s"}</span>{row.modules.length > 0 && <><span>·</span>{row.modules.map(module => <span key={module} className="rounded-full bg-[#f2f7f9] px-2 py-0.5">{moduleLabels[module] ?? module}</span>)}</>}</div></CardContent></Card>;
}

function SummaryCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: "blue" | "green" | "yellow"; icon: React.ReactNode }) {
  const classes = tone === "green" ? "bg-[#eef8f0] text-[#3f8750]" : tone === "yellow" ? "bg-[#fff8e5] text-[#9a6b12]" : "bg-[#e5f1f6] text-[#2e718f]";
  return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#6e7f88]">{label}</p><p className="mt-3 text-2xl font-semibold text-[#174f6f]">{value}</p><p className="mt-1 text-xs text-[#8b989d]">{detail}</p></div><div className={`rounded-xl p-3 ${classes}`}>{icon}</div></div></CardContent></Card>;
}
