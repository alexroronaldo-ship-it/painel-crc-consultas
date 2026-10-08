import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Loader2, Pencil, Plus } from "lucide-react";

const weeks = [1, 2, 3, 4, 5] as const;

export type WeeklyTaskRecord = {
  week: number;
  taskCount: number;
  description: string;
};

export default function WeeklyTasksDashboard({ name, records, enabled, isLoading = false, onAdd, onEdit, buttonLabel = "Registrar tarefas da semana", readOnly = false }: {
  name: string;
  records: WeeklyTaskRecord[];
  enabled: boolean;
  isLoading?: boolean;
  readOnly?: boolean;
  onAdd: () => void;
  onEdit: (week: number) => void;
  buttonLabel?: string;
}) {
  const weeksAtGoal = records.filter(record => record.taskCount >= 100).length;
  const totalTasks = records.reduce((sum, record) => sum + record.taskCount, 0);

  return <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm">
    <CardHeader className="border-b border-[#edf2f4] pb-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-[#2e7da3]" /><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2e7da3]">Tarefas semanais</p></div>
          <CardTitle className="mt-1 text-lg text-[#174f6f]">Dashboard de tarefas · {name}</CardTitle>
          <p className="mt-1 text-xs text-[#8b989d]">Meta mínima de 100 tarefas em cada semana.</p>
        </div>
        <div className="flex gap-2"><Badge variant="outline" className="border-[#c9dfe8] bg-[#eef7fa] text-[#2e718f]">{weeksAtGoal}/5 metas</Badge><Badge variant="outline" className="border-[#dce5dd] bg-[#f6f8f6] text-[#486a7b]">{totalTasks} tarefas</Badge></div>
      </div>
    </CardHeader>
    <CardContent className="p-5">
      {!enabled ? <div className="rounded-xl bg-[#f7fafb] p-5 text-sm text-[#6e7f88]">Selecione um mês específico para acompanhar as tarefas.</div> : isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6e7f88]"><Loader2 className="h-4 w-4 animate-spin" />Carregando tarefas...</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{weeks.map(week => {
        const record = records.find(item => item.week === week);
        const count = record?.taskCount ?? 0;
        const reached = count >= 100;
        const progress = Math.min(100, count);
        return <button type="button" key={week} onClick={() => onEdit(week)} disabled={!enabled || readOnly} className="rounded-xl border border-[#dce8ed] bg-[#fbfdfe] p-4 text-left transition-colors hover:border-[#a9cbd9] hover:bg-[#f4fafc] disabled:cursor-default">
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#174f6f]">S{week}</span>{record ? <Pencil className="h-3.5 w-3.5 text-[#7d98a5]" /> : <Plus className="h-3.5 w-3.5 text-[#7d98a5]" />}</div>
          <p className="mt-4 text-2xl font-semibold text-[#174f6f]">{count}</p>
          <p className="text-[11px] text-[#8b989d]">meta: 100</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfeaf0]"><div className={`h-full rounded-full ${reached ? "bg-[#58b981]" : "bg-[#2e7da3]"}`} style={{ width: `${progress}%` }} /></div>
          <p className={`mt-2 text-[11px] font-semibold ${reached ? "text-[#3f8750]" : record ? "text-[#a45d28]" : "text-[#98a5ab]"}`}>{reached ? `Meta batida · +${count - 100}` : record ? `Faltam ${100 - count}` : "Aguardando registro"}</p>
          <p className={`mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 ${record ? "text-[#617782]" : "text-[#a5b0b5]"}`}>{record?.description || "Nenhuma tarefa descrita"}</p>
        </button>;
      })}</div>}
      <Button type="button" onClick={onAdd} disabled={!enabled || readOnly} variant="outline" className="mt-4 w-full border-[#c9dfe8] text-[#2e718f] hover:bg-[#eef7fa]"><Plus className="mr-2 h-4 w-4" />{buttonLabel}</Button>
    </CardContent>
  </Card>;
}
