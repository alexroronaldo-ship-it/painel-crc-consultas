import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ListChecks, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const weeks = [1, 2, 3, 4, 5] as const;

export default function ValWeeklyTasks({ month }: { month: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [taskCount, setTaskCount] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.weeklyActivities.list.useQuery({ month: month || "2000-01" }, { enabled: Boolean(month) });
  const records = (query.data ?? []).filter(record => record.crcName === "VAL");
  const saveMutation = trpc.weeklyActivities.save.useMutation({
    onSuccess: async () => {
      await utils.weeklyActivities.list.invalidate();
      setDialogOpen(false);
      toast.success("Tarefas semanais da Val salvas com sucesso");
    },
    onError: error => toast.error(error.message),
  });

  const openWeek = (week?: number) => {
    if (!month) return toast.error("Selecione um mês para registrar as tarefas da Val");
    const targetWeek = week ?? weeks.find(item => !records.some(record => record.week === item)) ?? 5;
    const existing = records.find(record => record.week === targetWeek);
    setSelectedWeek(targetWeek);
    setTaskCount(existing ? String(existing.taskCount) : "");
    setDescription(existing?.description ?? "");
    setDialogOpen(true);
  };

  const changeWeek = (week: number) => {
    const existing = records.find(record => record.week === week);
    setSelectedWeek(week);
    setTaskCount(existing ? String(existing.taskCount) : "");
    setDescription(existing?.description ?? "");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const count = Number(taskCount);
    if (!Number.isInteger(count) || count < 0) return toast.error("Informe uma quantidade válida de tarefas");
    saveMutation.mutate({ crcName: "VAL", month, week: selectedWeek, taskCount: count, description });
  };

  const weeksAtGoal = records.filter(record => record.taskCount >= 100).length;
  const totalTasks = records.reduce((sum, record) => sum + record.taskCount, 0);

  return <>
    <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm">
      <CardHeader className="border-b border-[#edf2f4] pb-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-[#2e7da3]" /><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2e7da3]">Val · acompanhamento semanal</p></div><CardTitle className="mt-1 text-lg text-[#174f6f]">Tarefas realizadas pela Val</CardTitle><p className="mt-1 text-xs text-[#8b989d]">Meta mínima de 100 tarefas por semana, de S1 a S5.</p></div><div className="flex gap-2"><Badge variant="outline" className="border-[#c9dfe8] bg-[#eef7fa] text-[#2e718f]">{weeksAtGoal}/5 metas</Badge><Badge variant="outline" className="border-[#dce5dd] bg-[#f6f8f6] text-[#486a7b]">{totalTasks} tarefas</Badge></div></div></CardHeader>
      <CardContent className="p-0">{!month ? <div className="p-5 text-sm text-[#6e7f88]">Selecione um mês específico para acompanhar as tarefas.</div> : query.isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6e7f88]"><Loader2 className="h-4 w-4 animate-spin" />Carregando tarefas...</div> : <div className="divide-y divide-[#edf2f4]">{weeks.map(week => { const record = records.find(item => item.week === week); const count = record?.taskCount ?? 0; const reached = count >= 100; return <button type="button" key={week} onClick={() => openWeek(week)} className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-[#fbfdfe]"><span className={`mt-0.5 flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${reached ? "bg-[#e9f7eb] text-[#3f8750]" : record ? "bg-[#fff7df] text-[#9a6b12]" : "bg-[#f1f4f5] text-[#8b989d]"}`}>S{week}</span><span className="min-w-0 flex-1"><span className={`block text-sm leading-5 ${record ? "text-[#486a7b]" : "text-[#98a5ab]"}`}>{record?.description || "Nenhuma tarefa registrada"}</span><span className={`mt-1 block text-[11px] font-semibold ${reached ? "text-[#3f8750]" : record ? "text-[#a45d28]" : "text-[#98a5ab]"}`}>{reached ? `${count} tarefas · Meta batida` : record ? `${count} tarefas · Faltam ${100 - count}` : "0/100 tarefas"}</span></span></button>; })}</div>}
        <div className="border-t border-[#e3edf1] bg-[#fbfdfe] p-4"><Button type="button" onClick={() => openWeek()} disabled={!month} variant="outline" className="w-full border-[#c9dfe8] text-[#2e718f] hover:bg-[#eef7fa]"><Plus className="mr-2 h-4 w-4" />Registrar ou editar tarefas da Val</Button></div>
      </CardContent>
    </Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="border-[#d8e5eb] bg-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-[#174f6f]">Tarefas semanais · Val</DialogTitle><DialogDescription>Registre a quantidade e o descritivo das tarefas realizadas. A meta mínima é de 100 tarefas por semana.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Semana</label><select value={selectedWeek} onChange={event => changeWeek(Number(event.target.value))} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm">{weeks.map(week => <option key={week} value={week}>S{week}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Quantidade de tarefas</label><Input type="number" min="0" step="1" value={taskCount} onChange={event => setTaskCount(event.target.value)} placeholder="Meta: 100" required /></div></div><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Tarefas realizadas</label><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Descreva as tarefas realizadas pela Val" className="min-h-32 resize-y" required /></div><div className="grid grid-cols-5 gap-2">{weeks.map(week => { const record = records.find(item => item.week === week); return <button type="button" key={week} onClick={() => changeWeek(week)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${selectedWeek === week ? "border-[#2e7da3] bg-[#e9f4f8] text-[#174f6f]" : (record?.taskCount ?? 0) >= 100 ? "border-[#b9dfc0] bg-[#eef8f0] text-[#3f8750]" : record ? "border-[#f1d99b] bg-[#fff7df] text-[#9a6b12]" : "border-[#d8e5eb] bg-white text-[#7d8d95]"}`}>S{week}</button>; })}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveMutation.isPending} className="bg-[#2e7da3] hover:bg-[#246989]">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Salvar tarefas</>}</Button></DialogFooter></form></DialogContent></Dialog>
  </>;
}
