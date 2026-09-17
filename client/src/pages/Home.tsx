import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Check, Loader2, Plus, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);

export default function Home() {
  const [crcName, setCrcName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [closedItem, setClosedItem] = useState("");
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const recordsQuery = trpc.closures.list.useQuery();
  const createMutation = trpc.closures.create.useMutation({
    onSuccess: async () => {
      await utils.closures.list.invalidate();
      setPatientName(""); setPhone(""); setClosingDate(""); setClosedItem(""); setValue("");
      toast.success("Fechamento adicionado à planilha");
    },
    onError: error => toast.error(error.message),
  });
  const records = recordsQuery.data ?? [];
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return records;
    return records.filter(item => `${item.crcName} ${item.patientName} ${item.phone} ${item.closedItem}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [records, search]);
  const total = records.reduce((sum, item) => sum + Number(item.value), 0);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!crcName) { toast.error("Selecione o nome do CRC"); return; }
    createMutation.mutate({ crcName: crcName as "WISLLAYNI" | "JAYZA", patientName, phone, closingDate, closedItem, value });
  };

  return <DashboardLayout><div className="min-h-screen bg-[#f5f7f4] px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
    <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6c8d72]">Controle comercial</p><h1 className="text-3xl font-semibold tracking-tight text-[#1f3c2a]">Fechamentos</h1><p className="mt-1 text-sm text-[#758277]">Registre cada fechamento feito pela equipe de CRC.</p></div><div className="rounded-lg border border-[#dbe4da] bg-white px-3 py-2 text-xs text-[#65806b]">Total: <strong className="text-[#316c48]">{currencyFormatter.format(total)}</strong></div></header>
    <Card className="mb-6 border-[#dbe4da] bg-white shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e2f0e3] text-[#316c48]"><Plus className="h-4 w-4" /></div><div><h2 className="font-semibold text-[#294a33]">Novo fechamento</h2><p className="text-xs text-[#7b897d]">Selecione o CRC e preencha os dados do fechamento.</p></div></div><form onSubmit={submit} className="grid gap-3 md:grid-cols-[.9fr_1.2fr_1fr_1fr_1.5fr_1fr_auto] md:items-end"><div><label className="mb-1.5 block text-xs font-semibold text-[#526c58]" htmlFor="crc">Nome do CRC</label><select id="crc" value={crcName} onChange={e => setCrcName(e.target.value)} required className="h-10 w-full rounded-md border border-[#d5e1d5] bg-[#fcfdfc] px-3 text-sm text-[#526c58] outline-none focus:ring-2 focus:ring-[#7eaa87]"><option value="">Selecionar</option><option value="WISLLAYNI">WISLLAYNI</option><option value="JAYZA">JAYZA</option></select></div><div><label className="mb-1.5 block text-xs font-semibold text-[#526c58]" htmlFor="patient-name">Nome do paciente</label><Input id="patient-name" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Nome completo" required className="h-10 border-[#d5e1d5] bg-[#fcfdfc]" /></div><div><label className="mb-1.5 block text-xs font-semibold text-[#526c58]" htmlFor="phone">Telefone</label><Input id="phone" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-0000" required className="h-10 border-[#d5e1d5] bg-[#fcfdfc]" /></div><div><label className="mb-1.5 block text-xs font-semibold text-[#526c58]" htmlFor="date">Data do fechamento</label><Input id="date" type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} required className="h-10 border-[#d5e1d5] bg-[#fcfdfc]" /></div><div><label className="mb-1.5 block text-xs font-semibold text-[#526c58]" htmlFor="closed-item">O que fechou</label><Textarea id="closed-item" value={closedItem} onChange={e => setClosedItem(e.target.value)} placeholder="Produto, tratamento ou serviço" required className="min-h-10 resize-none border-[#d5e1d5] bg-[#fcfdfc] py-2" /></div><div><label className="mb-1.5 block text-xs font-semibold text-[#526c58]" htmlFor="value">Valor (R$)</label><Input id="value" value={value} onChange={e => setValue(e.target.value.replace(/[^\d,]/g, ""))} placeholder="0,00" inputMode="decimal" required className="h-10 border-[#d5e1d5] bg-[#fcfdfc]" /></div><Button type="submit" disabled={createMutation.isPending} className="h-10 bg-[#316c48] px-5 hover:bg-[#265a3a]">{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Adicionar</>}</Button></form></CardContent></Card>
    <Card className="overflow-hidden border-[#dbe4da] bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-[#e7eee6] p-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#294a33]">Lista de fechamentos</h2><p className="text-xs text-[#7b897d]">Os fechamentos mais recentes aparecem primeiro.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a094]" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CRC..." className="h-9 border-[#d5e1d5] pl-9 text-sm" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f7faf6] text-xs uppercase tracking-wide text-[#708374]"><tr><th className="px-5 py-3 font-semibold">CRC</th><th className="px-5 py-3 font-semibold">Paciente</th><th className="px-5 py-3 font-semibold">Telefone</th><th className="px-5 py-3 font-semibold">Data</th><th className="px-5 py-3 font-semibold">O que fechou</th><th className="px-5 py-3 text-right font-semibold">Valor</th></tr></thead><tbody className="divide-y divide-[#edf1ec]">{recordsQuery.isLoading ? <tr><td colSpan={6} className="py-12 text-center text-[#819084]"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando...</td></tr> : filteredRecords.length === 0 ? <tr><td colSpan={6} className="py-14 text-center"><UserRound className="mx-auto mb-2 h-6 w-6 text-[#9ab09d]" /><p className="font-medium text-[#526c58]">{search ? "Nenhum fechamento encontrado" : "Nenhum fechamento cadastrado"}</p><p className="mt-1 text-xs text-[#849287]">{search ? "Tente outro nome, paciente ou CRC." : "Use o formulário acima para começar."}</p></td></tr> : filteredRecords.map(record => <tr key={record.id} className="transition-colors hover:bg-[#fbfdfb]"><td className="px-5 py-4"><Badge variant="outline" className="border-[#cfe0d0] bg-[#f4faf4] font-medium text-[#4a7756]">{record.crcName}</Badge></td><td className="px-5 py-4 font-medium text-[#294a33]">{record.patientName}</td><td className="px-5 py-4 text-[#64766a]">{record.phone}</td><td className="whitespace-nowrap px-5 py-4 text-[#64766a]"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#79a284]" />{dateFormatter.format(new Date(`${record.closingDate}T12:00:00`))}</span></td><td className="max-w-sm px-5 py-4 text-[#64766a]">{record.closedItem}</td><td className="px-5 py-4 text-right font-semibold text-[#316c48]">{currencyFormatter.format(Number(record.value))}</td></tr>)}</tbody></table></div></Card>
    <p className="mt-4 text-xs text-[#8a988d]">Acesso restrito à equipe autenticada.</p>
  </div></div></DashboardLayout>;
}
