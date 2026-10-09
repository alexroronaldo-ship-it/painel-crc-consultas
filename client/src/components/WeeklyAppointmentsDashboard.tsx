import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CalendarCheck2, Check, Loader2, Pencil, Plus, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const weeks = [1, 2, 3, 4, 5] as const;

type CrcName = "WISLLAYNI" | "JAYZA" | "VAL";

export default function WeeklyAppointmentsDashboard({ month, crcName, displayName, readOnly = false }: { month: string; crcName: CrcName; displayName: string; readOnly?: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [appointmentCount, setAppointmentCount] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.weeklyAppointments.list.useQuery({ month: month || "2000-01" }, { enabled: Boolean(month) });
  const records = (query.data ?? []).filter(record => record.crcName === crcName);
  const saveMutation = trpc.weeklyAppointments.save.useMutation({
    onSuccess: async () => {
      await utils.weeklyAppointments.list.invalidate();
      setDialogOpen(false);
      toast.success("Agendamentos semanais salvos com sucesso");
    },
    onError: error => toast.error(error.message),
  });

  const openWeek = (week?: number) => {
    if (readOnly) return;
    if (!month) return toast.error("Selecione um mês para registrar os agendamentos");
    const targetWeek = week ?? weeks.find(item => !records.some(record => record.week === item)) ?? 5;
    const existing = records.find(record => record.week === targetWeek);
    setSelectedWeek(targetWeek);
    setAppointmentCount(existing ? String(existing.appointmentCount) : "");
    setWeeklyGoal(existing ? String(existing.weeklyGoal) : "");
    setDialogOpen(true);
  };

  const changeWeek = (week: number) => {
    const existing = records.find(record => record.week === week);
    setSelectedWeek(week);
    setAppointmentCount(existing ? String(existing.appointmentCount) : "");
    setWeeklyGoal(existing ? String(existing.weeklyGoal) : "");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const count = Number(appointmentCount);
    const goal = Number(weeklyGoal);
    if (!Number.isInteger(count) || count < 0) return toast.error("Informe uma quantidade válida de agendamentos");
    if (!Number.isInteger(goal) || goal < 1) return toast.error("Informe uma meta semanal maior que zero");
    saveMutation.mutate({ crcName, month, week: selectedWeek, appointmentCount: count, weeklyGoal: goal });
  };

  const goalsReached = records.filter(record => record.appointmentCount >= record.weeklyGoal).length;
  const totalAppointments = records.reduce((sum, record) => sum + record.appointmentCount, 0);

  return <>
    <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm">
      <CardHeader className="border-b border-[#edf2f4] pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2"><CalendarCheck2 className="h-4 w-4 text-[#2e7da3]" /><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2e7da3]">Agendamentos semanais</p></div>
            <CardTitle className="mt-1 text-lg text-[#174f6f]">Dashboard de agendamentos · {displayName}</CardTitle>
            <p className="mt-1 text-xs text-[#8b989d]">Informe o realizado e defina uma meta diferente para cada semana.</p>
          </div>
          <div className="flex gap-2"><Badge variant="outline" className="border-[#c9dfe8] bg-[#eef7fa] text-[#2e718f]">{goalsReached}/5 metas</Badge><Badge variant="outline" className="border-[#dce5dd] bg-[#f6f8f6] text-[#486a7b]">{totalAppointments} agendamentos</Badge></div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {!month ? <div className="rounded-xl bg-[#f7fafb] p-5 text-sm text-[#6e7f88]">Selecione um mês específico para acompanhar os agendamentos.</div> : query.isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6e7f88]"><Loader2 className="h-4 w-4 animate-spin" />Carregando agendamentos...</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{weeks.map(week => {
          const record = records.find(item => item.week === week);
          const count = record?.appointmentCount ?? 0;
          const goal = record?.weeklyGoal ?? 0;
          const reached = Boolean(record) && count >= goal;
          const progress = goal > 0 ? Math.min(100, (count / goal) * 100) : 0;
          return <button type="button" key={week} disabled={readOnly} onClick={() => openWeek(week)} className="rounded-xl border border-[#dce8ed] bg-[#fbfdfe] p-4 text-left transition-colors hover:border-[#a9cbd9] hover:bg-[#f4fafc]">
            <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#174f6f]">S{week}</span>{record ? <Pencil className="h-3.5 w-3.5 text-[#7d98a5]" /> : <Plus className="h-3.5 w-3.5 text-[#7d98a5]" />}</div>
            <p className="mt-4 text-2xl font-semibold text-[#174f6f]">{count}</p>
            <p className="text-[11px] text-[#8b989d]">meta: {goal || "—"}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfeaf0]"><div className={`h-full rounded-full ${reached ? "bg-[#58b981]" : "bg-[#2e7da3]"}`} style={{ width: `${progress}%` }} /></div>
            <p className={`mt-2 text-[11px] font-semibold ${reached ? "text-[#3f8750]" : record ? "text-[#a45d28]" : "text-[#98a5ab]"}`}>{reached ? `Meta batida · +${count - goal}` : record ? `Faltam ${goal - count}` : "Aguardando registro"}</p>
          </button>;
        })}</div>}
        <Button type="button" onClick={() => openWeek()} disabled={!month || readOnly} variant="outline" className="mt-4 w-full border-[#c9dfe8] text-[#2e718f] hover:bg-[#eef7fa]"><Plus className="mr-2 h-4 w-4" />Registrar agendamentos da semana</Button>
      </CardContent>
    </Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="border-[#d8e5eb] bg-white sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-[#174f6f]">Agendamentos · {displayName}</DialogTitle><DialogDescription>Preencha o realizado e a meta da semana. Você pode alterar a meta individualmente em S1, S2, S3, S4 ou S5.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Semana</label><select value={selectedWeek} onChange={event => changeWeek(Number(event.target.value))} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm">{weeks.map(week => <option key={week} value={week}>S{week}</option>)}</select></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Agendamentos realizados</label><Input type="number" min="0" step="1" value={appointmentCount} onChange={event => setAppointmentCount(event.target.value)} placeholder="Ex.: 32" required /></div><div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">Meta desta semana</label><Input type="number" min="1" step="1" value={weeklyGoal} onChange={event => setWeeklyGoal(event.target.value)} placeholder="Ex.: 40" required /></div></div>
          <div className="grid grid-cols-5 gap-2">{weeks.map(week => { const record = records.find(item => item.week === week); const reached = Boolean(record) && record!.appointmentCount >= record!.weeklyGoal; return <button type="button" key={week} onClick={() => changeWeek(week)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${selectedWeek === week ? "border-[#2e7da3] bg-[#e9f4f8] text-[#174f6f]" : reached ? "border-[#b9dfc0] bg-[#eef8f0] text-[#3f8750]" : record ? "border-[#f1d99b] bg-[#fff7df] text-[#9a6b12]" : "border-[#d8e5eb] bg-white text-[#7d8d95]"}`}>S{week}</button>; })}</div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveMutation.isPending} className="bg-[#2e7da3] hover:bg-[#246989]">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Salvar semana</>}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
