import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateWeeklySales, type SaleRecord } from "@/lib/weekly-sales";
import { BarChart3 } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const colors = ["bg-[#58cba3]", "bg-[#6ed8b6]", "bg-[#d69a1f]", "bg-[#d95454]"];

export default function WeeklySalesChart({ records, month }: { records: SaleRecord[]; month: string }) {
  if (!month) {
    return <Card className="border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-[#174f6f]"><BarChart3 className="h-5 w-5 text-[#2e7da3]" />Vendas da equipe por semana</CardTitle><p className="text-xs text-[#84949c]">Selecione um mês específico para visualizar S1–S4.</p></CardHeader></Card>;
  }

  const weeks = calculateWeeklySales(records, month);
  const max = Math.max(...weeks.map(week => week.total), 1);
  const total = weeks.reduce((sum, week) => sum + week.total, 0);

  return <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><CardHeader className="border-b border-[#edf2f4]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2e7da3]">Fechamento da equipe</p><CardTitle className="mt-1 text-xl text-[#174f6f]">Vendas totais por semana</CardTitle><p className="mt-1 text-xs text-[#84949c]">Somente WISLLAYNI + JAYZA, divididas em quatro períodos do mês.</p></div><div className="rounded-xl bg-[#eef7fa] px-4 py-3 text-left sm:text-right"><p className="text-[11px] text-[#6e7f88]">Total do mês</p><p className="text-xl font-semibold text-[#2e7da3]">{currencyFormatter.format(total)}</p></div></div></CardHeader><CardContent className="p-5 sm:p-6"><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{weeks.map((week, index) => { const height = week.total > 0 ? Math.max(18, Math.round((week.total / max) * 100)) : 6; return <div key={week.week} className="flex min-w-0 flex-col"><div className="mb-2 text-center"><p className="truncate text-sm font-semibold text-[#174f6f]">{currencyFormatter.format(week.total)}</p><p className="text-[10px] text-[#8b989d]">{week.count} venda{week.count === 1 ? "" : "s"}</p></div><div className="flex h-44 items-end rounded-xl bg-[#f3f7f8] p-1"><div className={`w-full rounded-lg ${colors[index]} shadow-sm transition-all duration-300`} style={{ height: `${height}%` }} /></div><div className="mt-2 text-center"><p className="text-sm font-bold text-[#174f6f]">{week.label}</p><p className="text-[11px] text-[#8b989d]">{week.period}</p></div></div>; })}</div></CardContent></Card>;
}
