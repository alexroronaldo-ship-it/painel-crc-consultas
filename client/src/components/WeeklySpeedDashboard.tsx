import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateWeeklyBonus, calculateWeeklySpeed, type TimedClosure } from "@/lib/weekly-speed";
import { Flame } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function WeeklySpeedDashboard({ records, enabled, displayName }: { records: TimedClosure[]; enabled: boolean; displayName?: string }) {
  const weeks = calculateWeeklySpeed(records);
  const completedWeeks = weeks.filter(week => week.metGoal).length;
  const baseBonus = completedWeeks * 10;
  const totalBonus = calculateWeeklyBonus(completedWeeks);

  return <Card className="border-[#d8e5eb] bg-white shadow-sm">
    <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Flame className="h-4 w-4 text-[#e27943]" /><CardTitle className="text-base text-[#174f6f]">Sequência de resposta rápida{displayName ? ` · ${displayName}` : ""}</CardTitle></div><p className="mt-1 text-xs text-[#8b989d]">Cada semana com média de até 2 minutos vale R$ 10.</p></div><Badge variant="outline" className="border-[#f1d99b] bg-[#fff7df] text-[#9a6b12]">{completedWeeks}/5</Badge></div></CardHeader>
    <CardContent>
      {!enabled ? <div className="rounded-lg bg-[#f7fafb] p-4 text-sm text-[#6e7f88]">Selecione um mês específico para acompanhar as cinco semanas.</div> : <div className="space-y-1">{weeks.map(week => <div key={week.week} className="flex items-center justify-between gap-3 border-b border-[#edf2f4] py-2.5 last:border-0"><p className="text-sm font-medium text-[#335f76]">Semana {week.week}</p><p className={`text-sm font-semibold ${week.metGoal ? "text-[#3f8750]" : week.averageSeconds !== null ? "text-[#ad4d4d]" : "text-[#8b989d]"}`}>{week.metGoal ? "✅ ≤ 2 min — R$ 10" : week.averageSeconds !== null ? "❌ > 2 min — R$ 0" : "⬜ Sem dados — R$ 0"}</p></div>)}</div>}
      <div className="mt-4 rounded-xl bg-[#eef7fa] p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#486a7b]">Bônus atual</span><strong className="text-lg text-[#2e7da3]">{currencyFormatter.format(baseBonus)}</strong></div><div className="mt-2 flex items-center justify-between border-t border-[#d7e8ef] pt-2"><span className="text-xs font-semibold text-[#174f6f]">Excelência 5/5</span><strong className="text-sm text-[#3f8750]">+ R$ 10</strong></div>{completedWeeks === 5 && <p className="mt-2 text-xs font-semibold text-[#2e7da3]">Total com excelência: {currencyFormatter.format(totalBonus)}</p>}</div>
    </CardContent>
  </Card>;
}
