import DashboardLayout from "@/components/DashboardLayout";
import TablePagination from "@/components/TablePagination";
import ValWeeklyTasks from "@/components/ValWeeklyTasks";
import WeeklyAppointmentsDashboard from "@/components/WeeklyAppointmentsDashboard";
import WeeklySpeedDashboard from "@/components/WeeklySpeedDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calculateGoalProgress } from "@/lib/goal-progress";
import { paginateItems } from "@/lib/pagination";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Check, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const formatDuration = (seconds: number) => seconds > 0 ? `${Math.floor(seconds / 60)}min ${String(seconds % 60).padStart(2, "0")}s` : "—";
const insurancePlans = ["Uniodonto", "Unimed", "Rede Unna", "Amil"] as const;
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export default function ValDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [saleDate, setSaleDate] = useState("");
  const [value, setValue] = useState("");
  const [totalTimeMinutes, setTotalTimeMinutes] = useState("");
  const [insurancePlan, setInsurancePlan] = useState("");
  const [notes, setNotes] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const queryInput = useMemo(() => selectedMonth ? { month: selectedMonth } : undefined, [selectedMonth]);
  const periodLabel = useMemo(() => selectedMonth ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`)) : "Todo o período", [selectedMonth]);
  const utils = trpc.useUtils();
  const salesQuery = trpc.valSales.list.useQuery(queryInput);
  const sales = salesQuery.data ?? [];
  const paginatedSales = useMemo(() => paginateItems(sales, salesPage), [sales, salesPage]);
  const speedRecords = useMemo(() => sales.map(sale => ({ closingDate: sale.saleDate, totalTimeSeconds: sale.totalTimeSeconds })), [sales]);
  const total = sales.reduce((sum, sale) => sum + Number(sale.value), 0);
  const progress = calculateGoalProgress(total);
  const createMutation = trpc.valSales.create.useMutation({ onSuccess: async (_data, variables) => { setSelectedMonth(variables.saleDate.slice(0, 7)); setSalesPage(1); await utils.valSales.list.invalidate(); setSaleDate(""); setValue(""); setTotalTimeMinutes(""); setInsurancePlan(""); setNotes(""); toast.success("Venda da Odontomab salva com sucesso"); }, onError: error => toast.error(error.message) });
  const deleteMutation = trpc.valSales.deleteOne.useMutation({ onSuccess: async () => { await utils.valSales.list.invalidate(); toast.success("Venda da Odontomab excluída com sucesso"); }, onError: error => toast.error(error.message) });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = Number(totalTimeMinutes.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes < 0) return toast.error("Informe um tempo de atendimento válido");
    createMutation.mutate({ saleDate, value, totalTimeSeconds: Math.round(minutes * 60), insurancePlan: insurancePlan ? insurancePlan as (typeof insurancePlans)[number] : undefined, notes: notes || undefined });
  };

  const deleteOne = (id: number) => {
    const password = window.prompt("Digite a senha para remover esta venda:");
    if (password === null) return;
    if (!window.confirm("Remover esta venda da Odontomab?")) return;
    deleteMutation.mutate({ id, password });
  };

  return <DashboardLayout><div className="min-h-screen bg-[#f3f8fb] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-6xl">
    <header className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><img src="/manus-storage/odontomab-horizontal_dfd3d9f9.png" alt="Odontomab — Excelência ao alcance de todos" className="mb-5 h-16 w-auto max-w-full object-contain object-left sm:h-20" /><h1 className="text-3xl font-semibold tracking-tight text-[#174f6f]">Odontomab</h1><p className="mt-1 text-sm text-[#6e7f88]">Vendas da unidade acompanhadas separadamente da equipe de fechamento.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div><label htmlFor="val-period-filter" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6e7f88]">Período da dashboard</label><Input id="val-period-filter" type="month" value={selectedMonth} onChange={event => { setSelectedMonth(event.target.value); setSalesPage(1); }} className="h-9 w-44 border-[#d7e5ec] bg-white" /></div><Button type="button" variant="outline" onClick={() => { setSelectedMonth(""); setSalesPage(1); }} className="h-9 border-[#d7e5ec] bg-white text-[#486a7b]">Todo período</Button></div></header>

    <div className="mb-4 flex items-center gap-2 text-xs text-[#6e7f88]"><CalendarDays className="h-4 w-4 text-[#b4a92f]" /><span>Vendas da Odontomab em <strong className="capitalize text-[#174f6f]">{periodLabel}</strong></span></div>

    {salesQuery.isLoading ? <Card className="border-[#d8e5eb] bg-white"><CardContent className="flex items-center justify-center gap-2 py-16 text-[#6e7f88]"><Loader2 className="h-5 w-5 animate-spin" />Carregando vendas da Odontomab...</CardContent></Card> : <>
      <section className="mb-6 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]"><Card className="border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-6"><div className="flex justify-between text-sm text-[#6e7f88]">Total vendido pela Odontomab <Target className="h-5 w-5 text-[#2e7da3]" /></div><p className="mt-4 text-3xl font-semibold text-[#174f6f]">{currencyFormatter.format(total)}</p><p className="mt-2 text-xs text-[#8b989d]">{sales.length} venda{sales.length === 1 ? "" : "s"} própria{sales.length === 1 ? "" : "s"} no período</p><div className="mt-5 rounded-xl bg-[#fff9dc] p-4 text-xs text-[#766f20]">As vendas de Wisllayny e Jaiza não entram nesta página.</div></CardContent></Card><Card className="overflow-hidden border-[#cddfe8] bg-white shadow-sm"><CardContent className="p-6"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2e7da3]">Meta da Odontomab</p><h2 className="mt-1 text-xl font-semibold text-[#174f6f]">Progresso de R$ 0 a R$ 75 mil</h2><div className="mt-6 flex items-end justify-between gap-4"><div><p className="text-xs text-[#6e7f88]">Venda acumulada</p><p className="mt-1 text-2xl font-semibold text-[#174f6f]">{currencyFormatter.format(total)}</p></div><div className="text-right"><p className="text-xs text-[#6e7f88]">{progress.reached ? "Acima da meta" : "Falta para a meta"}</p><p className={`mt-1 text-2xl font-semibold ${progress.reached ? "text-[#3f8750]" : "text-[#9b9130]"}`}>{currencyFormatter.format(progress.reached ? progress.surplus : progress.remaining)}</p></div></div><div className="relative mt-5 h-5 overflow-hidden rounded-full bg-[#dfeaf0]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#2e7da3,#d5c83a)] transition-all duration-300" style={{ width: `${progress.progressPercent}%` }} /><div className="absolute inset-y-0 right-0 w-1 bg-[#174f6f]" /></div><div className="mt-2 flex justify-between text-xs text-[#7d8d95]"><span>R$ 0</span><span>{progress.progressPercent.toFixed(1).replace(".", ",")}% concluído</span><span>R$ 75.000</span></div></CardContent></Card></section>

      <section className="mb-6"><ValWeeklyTasks month={selectedMonth} /></section>

      <section className="mb-6"><WeeklySpeedDashboard records={speedRecords} enabled={Boolean(selectedMonth)} displayName="Val" /></section>

      <section className="mb-6"><WeeklyAppointmentsDashboard month={selectedMonth} crcName="VAL" displayName="Val" /></section>

      <Card className="mb-6 border-[#d8e5eb] bg-white shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e5f1f6] text-[#2e7da3]"><Plus className="h-4 w-4" /></div><div><h2 className="font-semibold text-[#174f6f]">Registrar venda da Odontomab</h2><p className="text-xs text-[#7d8d95]">Este registro fica separado dos fechamentos da equipe.</p></div></div><form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.7fr_0.7fr_0.7fr_0.9fr_1.4fr_auto]"><Field label="Data da venda"><Input type="date" value={saleDate} onChange={event => setSaleDate(event.target.value)} required /></Field><Field label="Valor (R$)"><Input value={value} onChange={event => setValue(event.target.value.replace(/[^\d,]/g, ""))} placeholder="0,00" inputMode="decimal" required /></Field><Field label="Tempo total (min)"><Input value={totalTimeMinutes} onChange={event => setTotalTimeMinutes(event.target.value.replace(/[^\d,.]/g, ""))} placeholder="Ex.: 1,5" inputMode="decimal" required /></Field><Field label="Convênio"><select value={insurancePlan} onChange={event => setInsurancePlan(event.target.value)} className="h-10 w-full rounded-md border border-[#d7e5ec] bg-[#fbfdfe] px-3 text-sm"><option value="">Particular / sem convênio</option>{insurancePlans.map(plan => <option key={plan} value={plan}>{plan}</option>)}</select></Field><Field label="Observação"><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Descrição opcional" className="min-h-10 resize-none" /></Field><div className="flex items-end md:col-span-2 xl:col-span-1"><Button type="submit" disabled={createMutation.isPending} className="h-10 w-full bg-[#2e7da3] hover:bg-[#246989]">{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Adicionar</>}</Button></div></form></CardContent></Card>

      <Card className="overflow-hidden border-[#d8e5eb] bg-white shadow-sm"><CardHeader><CardTitle className="text-base text-[#174f6f]">Histórico de vendas da Odontomab</CardTitle><p className="text-xs text-[#84949c]">Exibindo até 5 vendas por página.</p></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead><tr className="border-y border-[#e5edf1] bg-[#f7fafb] text-left text-xs text-[#6e7f88]"><th className="px-5 py-3">Data</th><th className="px-5 py-3">Convênio</th><th className="px-5 py-3">Tempo</th><th className="px-5 py-3">Observação</th><th className="px-5 py-3 text-right">Valor</th><th className="px-5 py-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-[#edf2f4]">{sales.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-[#8b989d]">Nenhuma venda da Odontomab registrada neste período.</td></tr> : paginatedSales.items.map(sale => <tr key={sale.id}><td className="px-5 py-3 font-medium text-[#174f6f]">{dateFormatter.format(new Date(`${sale.saleDate}T12:00:00`))}</td><td className="px-5 py-3"><span className="rounded-full bg-[#eef7fa] px-2.5 py-1 text-xs font-medium text-[#2e718f]">{sale.insurancePlan || "Particular"}</span></td><td className="px-5 py-3 font-medium text-[#486a7b]">{formatDuration(sale.totalTimeSeconds)}</td><td className="px-5 py-3 text-[#617782]">{sale.notes || "—"}</td><td className="px-5 py-3 text-right font-semibold text-[#2e7da3]">{currencyFormatter.format(Number(sale.value))}</td><td className="px-5 py-3 text-right"><Button type="button" variant="outline" onClick={() => deleteOne(sale.id)} className="h-8 border-[#e2baba] px-2 text-[#a14f4f] hover:bg-[#fff0f0]"><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>)}</tbody></table></div><TablePagination page={paginatedSales.page} totalItems={paginatedSales.totalItems} label="vendas" onPageChange={setSalesPage} /></CardContent></Card>
    </>}
  </div></div></DashboardLayout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold text-[#486a7b]">{label}</label>{children}</div>;
}
