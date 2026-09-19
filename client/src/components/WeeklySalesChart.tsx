import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateWeeklyGoal, calculateWeeklySales, type SaleRecord, WEEKLY_SALES_GOAL } from "@/lib/weekly-sales";
import { BarChart3, Target } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function getBarColor(total: number) {
  if (total >= WEEKLY_SALES_GOAL) return "bg-[#58b981]";
  if (total >= WEEKLY_SALES_GOAL * 0.6) return "bg-[#d7a12c]";
  return "bg-[#d96666]";
}

export default function WeeklySalesChart({ records, month }: { records: SaleRecord[]; month: string }) {
  if (!month) {
    return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-[#174f6f]"><BarChart3 className="h-5 w-5 text-[#2e7da3]" />Vendas da equipe por semana</CardTitle><p className="text-xs text-[#84949c]">Selecione um mês específico para visualizar S1–S5 e a meta semanal.</p></CardHeader></Card>;
  }

  const weeks = calculateWeeklySales(records, month);
  const total = weeks.reduce((sum, week) => sum + week.total, 0);
  const chartMax = Math.max(WEEKLY_SALES_GOAL, ...weeks.map(week => week.total), 1) * 1.12;
  const goalPosition = (WEEKLY_SALES_GOAL / chartMax) * 100;

  return <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm">
    <CardHeader className="border-b border-[#edf2f4]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2e7da3]">Fechamento da equipe</p><CardTitle className="mt-1 text-xl text-[#174f6f]">Vendas totais por semana</CardTitle><p className="mt-1 text-xs text-[#84949c]">Somente WISLLAYNI + JAYZA, com meta de {currencyFormatter.format(WEEKLY_SALES_GOAL)} em cada semana.</p></div><div className="rounded-xl bg-[#eef7fa] px-4 py-3 text-left sm:text-right"><p className="text-[11px] text-[#6e7f88]">Total do mês</p><p className="text-xl font-semibold text-[#2e7da3]">{currencyFormatter.format(total)}</p></div></div></CardHeader>
    <CardContent className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-2 rounded-xl border border-[#dce8ed] bg-[#f7fafb] px-4 py-3 text-xs text-[#486a7b]"><Target className="h-4 w-4 text-[#b4a92f]" /><span>A linha tracejada marca a meta semanal de <strong>{currencyFormatter.format(WEEKLY_SALES_GOAL)}</strong>.</span></div><div className="grid grid-cols-2 gap-4 md:grid-cols-5">{weeks.map(week => { const result = calculateWeeklyGoal(week.total); const height = week.total > 0 ? Math.max(4, (week.total / chartMax) * 100) : 2; return <div key={week.week} className="flex min-w-0 flex-col"><div className="mb-2 text-center"><p className="truncate text-sm font-semibold text-[#174f6f]">{currencyFormatter.format(week.total)}</p><p className="text-[10px] text-[#8b989d]">{week.count} venda{week.count === 1 ? "" : "s"}</p></div><div className="relative flex h-48 items-end overflow-hidden rounded-xl bg-[#f3f7f8] p-1"><div className="absolute inset-x-1 z-10 border-t-2 border-dashed border-[#ad9d29]" style={{ bottom: `${goalPosition}%` }} /><div className={`w-full rounded-lg ${getBarColor(week.total)} shadow-sm transition-all duration-300`} style={{ height: `${height}%` }} /></div><div className="mt-2 text-center"><p className="text-sm font-bold text-[#174f6f]">{week.label}</p><p className="text-[11px] text-[#8b989d]">{week.period}</p><p className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${result.reached ? "bg-[#e9f7eb] text-[#2f7b40]" : "bg-[#fff4e8] text-[#a45d28]"}`}>{result.reached ? `Meta batida · +${currencyFormatter.format(result.surplus)}` : `Faltam ${currencyFormatter.format(result.remaining)}`}</p></div></div>; })}</div></CardContent>
  </Card>;
}
