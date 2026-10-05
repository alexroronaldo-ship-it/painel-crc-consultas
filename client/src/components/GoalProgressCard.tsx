import { Card, CardContent } from "@/components/ui/card";
import { calculateGoalProgress } from "@/lib/goal-progress";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function GoalProgressCard({ name, revenue }: { name: string; revenue: number }) {
  const progress = calculateGoalProgress(revenue);

  return <Card className="overflow-hidden border-[#cddfe8] bg-white shadow-sm"><CardContent className="p-5">
    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2e7da3]">Meta individual · {name}</p>
    <h3 className="mt-1 text-lg font-semibold text-[#174f6f]">Caminho até R$ 75 mil</h3>
    <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs text-[#6e7f88]">Venda acumulada</p><p className="text-xl font-semibold text-[#174f6f]">{currencyFormatter.format(revenue)}</p></div><div className="text-right"><p className="text-xs text-[#6e7f88]">{progress.reached ? "Acima da meta" : "Falta para a meta"}</p><p className={`text-xl font-semibold ${progress.reached ? "text-[#3f8750]" : "text-[#9b9130]"}`}>{currencyFormatter.format(progress.reached ? progress.surplus : progress.remaining)}</p></div></div>
    <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-[#dfeaf0]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#2e7da3,#d5c83a)]" style={{ width: `${progress.progressPercent}%` }} /><div className="absolute inset-y-0 right-0 w-1 bg-[#174f6f]" /></div>
    <div className="mt-2 flex justify-between text-xs text-[#7d8d95]"><span>{progress.progressPercent.toFixed(1).replace(".", ",")}% concluído</span><span>Meta R$ 75.000,00 · 0,50%</span></div>
  </CardContent></Card>;
}
