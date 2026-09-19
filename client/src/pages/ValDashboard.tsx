import DashboardLayout from "@/components/DashboardLayout";
import GoalProgressCard from "@/components/GoalProgressCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calculateCommission, formatCommissionRate, getCommissionRate } from "@/lib/commission";
import { calculateEligibleSales, isEligibleSalesCrc } from "@/lib/eligible-sales";
import { calculateGoalProgress } from "@/lib/goal-progress";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CircleDollarSign, Loader2, Target } from "lucide-react";
import { useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const crcNames = ["WISLLAYNI", "JAYZA"] as const;
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export default function ValDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const queryInput = useMemo(() => selectedMonth ? { month: selectedMonth } : undefined, [selectedMonth]);
  const periodLabel = useMemo(() => selectedMonth ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`)) : "Todo o período", [selectedMonth]);
  const recordsQuery = trpc.closures.list.useQuery(queryInput);
  const records = recordsQuery.data ?? [];
  const metrics = crcNames.map(name => {
    const own = records.filter(item => item.crcName === name);
    const revenue = own.reduce((sum, item) => sum + Number(item.value), 0);
    return { name, count: own.length, revenue, rate: getCommissionRate(revenue), commission: calculateCommission(revenue) };
  });
  const eligibleRecords = records.filter(item => isEligibleSalesCrc(item.crcName));
  const total = calculateEligibleSales(records);
  const totalCommission = metrics.reduce((sum, metric) => sum + metric.commission, 0);

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2e7da3]">Val · CRC</p><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Visão gerencial</h1><p className="mt-1 text-sm text-[#6e7f88]">Metas e comissões individuais de WISLLAYNI e JAYZA.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div><label htmlFor="val-period-filter" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Período da dashboard</label><Input id="val-period-filter" type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} className="h-9 w-44 border-[#d7e5ec] bg-white" /></div><Button type="button" variant="outline" onClick={() => setSelectedMonth("")} className="h-9 border-[#d7e5ec] bg-white text-[#486a7b]">Todo período</Button></div></header>

    <div className="mb-4 flex items-center gap-2 text-xs text-[#6e7f88]"><CalendarDays className="h-4 w-4 text-[#b4a92f]" /><span>Resultados de <strong className="capitalize text-[#174f6f]">{periodLabel}</strong></span></div>

    {recordsQuery.isLoading ? <Card className="border-[#d8e5eb] bg-white"><CardContent className="flex items-center justify-center gap-2 py-16 text-[#6e7f88]"><Loader2 className="h-5 w-5 animate-spin" />Carregando indicadores...</CardContent></Card> : <>
      <section className="mb-6 grid gap-4 sm:grid-cols-3"><Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex justify-between text-sm text-[#6e7f88]">Venda elegível <Target className="h-5 w-5 text-[#2e7da3]" /></div><p className="mt-3 text-2xl font-semibold text-[#174f6f]">{currencyFormatter.format(total)}</p><p className="mt-1 text-xs text-[#8b989d]">{eligibleRecords.length} fechamentos das duas CRCs</p></CardContent></Card><Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="flex justify-between text-sm text-[#6e7f88]">Comissões somadas <CircleDollarSign className="h-5 w-5 text-[#2e7da3]" /></div><p className="mt-3 text-2xl font-semibold text-[#2e7da3]">{currencyFormatter.format(totalCommission)}</p><p className="mt-1 text-xs text-[#8b989d]">o cálculo continua individual</p></CardContent></Card><Card className="border-[#e7e1b9] bg-[#fffdf4] shadow-sm"><CardContent className="p-5"><p className="text-sm text-[#7d783e]">Regra de elegibilidade</p><p className="mt-3 text-lg font-semibold text-[#766f20]">Val não entra nos totais</p><p className="mt-1 text-xs text-[#938d58]">Somente WISLLAYNI e JAYZA.</p></CardContent></Card></section>

      <Card className="mb-4 overflow-hidden border-[#cddfe8] bg-white shadow-sm"><div className="bg-[linear-gradient(135deg,#1f7198,#3e8bac)] px-6 py-5 text-white"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Acompanhamento da Val</p><h2 className="mt-1 text-2xl font-semibold">Metas individuais das CRCs</h2><p className="mt-1 text-sm text-white/75">Cada profissional avança separadamente até R$ 75 mil.</p></div></Card>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">{metrics.map(metric => <GoalProgressCard key={metric.name} name={metric.name} revenue={metric.revenue} commission={metric.commission} />)}</div>

      <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="text-base text-[#174f6f]">Resumo das comissões</CardTitle><p className="text-xs text-[#84949c]">Vendas, faixa e valor calculados separadamente.</p></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-y border-[#e5edf1] bg-[#f7fafb] text-left text-xs text-[#6e7f88]"><th className="px-5 py-3">CRC</th><th className="px-5 py-3 text-center">Fechamentos</th><th className="px-5 py-3 text-right">Venda própria</th><th className="px-5 py-3 text-center">Percentual</th><th className="px-5 py-3 text-right">Falta para R$ 75 mil</th><th className="px-5 py-3 text-right">Comissão</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{metrics.map(metric => { const progress = calculateGoalProgress(metric.revenue); return <tr key={metric.name}><td className="px-5 py-3 font-semibold text-[#174f6f]">{metric.name}</td><td className="px-5 py-3 text-center text-[#6e7f88]">{metric.count}</td><td className="px-5 py-3 text-right font-medium text-[#335f76]">{currencyFormatter.format(metric.revenue)}</td><td className="px-5 py-3 text-center text-[#486a7b]">{formatCommissionRate(metric.rate)}</td><td className="px-5 py-3 text-right font-medium text-[#9b9130]">{currencyFormatter.format(progress.remaining)}</td><td className="px-5 py-3 text-right font-semibold text-[#2e7da3]">{currencyFormatter.format(metric.commission)}</td></tr>; })}</tbody></table></div></CardContent></Card>
    </>}
  </div></div></DashboardLayout>;
}
