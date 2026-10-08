import WeeklyTasksDashboard from "@/components/WeeklyTasksDashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const weeks = [1, 2, 3, 4, 5] as const;

export default function OdontomabWeeklyTasks({ month, crcId, name }: { month: string; crcId: string; name: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [taskCount, setTaskCount] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.valSales.crcs.tasks.list.useQuery({ crcId, month: month || "2000-01" }, { enabled: Boolean(month) });
  const records = (query.data ?? []).filter(record => record.crcName === crcId);
  const saveMutation = trpc.valSales.crcs.tasks.save.useMutation({
    onSuccess: async () => {
      await utils.valSales.crcs.tasks.list.invalidate();
      setDialogOpen(false);
      toast.success(`Tarefas de ${name} salvas com sucesso`);
    },
    onError: error => toast.error(error.message),
  });

  const openWeek = (week?: number) => {
    if (!month) return toast.error("Selecione um mês para registrar as tarefas");
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
    saveMutation.mutate({ crcId, month, week: selectedWeek, taskCount: count, description });
  };

  return <>
    <WeeklyTasksDashboard name={name} records={records} enabled={Boolean(month)} isLoading={query.isLoading} onAdd={() => openWeek()} onEdit={openWeek} buttonLabel={`Registrar ou editar tarefas de ${name}`} />

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="border-[#d8e5eb] bg-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-[#174f6f]">Tarefas semanais · {name}</DialogTitle><DialogDescription>Registre a quantidade e o descritivo das tarefas realizadas. A meta mínima é de 100 tarefas por semana.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Semana</label><select value={selectedWeek} onChange={event => changeWeek(Number(event.target.value))} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm">{weeks.map(week => <option key={week} value={week}>S{week}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Quantidade de tarefas</label><Input type="number" min="0" step="1" value={taskCount} onChange={event => setTaskCount(event.target.value)} placeholder="Meta: 100" required /></div></div><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Tarefas realizadas</label><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder={`Descreva as tarefas realizadas por ${name}`} className="min-h-32 resize-y" required /></div><div className="grid grid-cols-5 gap-2">{weeks.map(week => { const record = records.find(item => item.week === week); return <button type="button" key={week} onClick={() => changeWeek(week)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${selectedWeek === week ? "border-[#2e7da3] bg-[#e9f4f8] text-[#174f6f]" : (record?.taskCount ?? 0) >= 100 ? "border-[#b9dfc0] bg-[#eef8f0] text-[#3f8750]" : record ? "border-[#f1d99b] bg-[#fff7df] text-[#9a6b12]" : "border-[#d8e5eb] bg-white text-[#7d8d95]"}`}>S{week}</button>; })}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveMutation.isPending} className="bg-[#2e7da3] hover:bg-[#246989]">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Salvar tarefas</>}</Button></DialogFooter></form></DialogContent></Dialog>
  </>;
}
