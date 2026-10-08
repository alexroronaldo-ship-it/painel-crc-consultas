import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Archive, History, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Crc = { id: string; name: string; photoUrl: string | null; isActive: boolean };
export default function OdontomabCrcRetirement({ crcs, selected, onSelect }: { crcs: Crc[]; selected?: Crc; onSelect: (id: string) => void }) {
  const { user } = useAuth();
  const [target, setTarget] = useState<Crc | null>(null);
  const [password, setPassword] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const removed = crcs.filter(crc => !crc.isActive);
  const remove = trpc.valSales.crcs.remove.useMutation({
    onSuccess: async (_result, input) => {
      setTarget(null); setPassword("");
      await utils.valSales.crcs.list.invalidate();
      const latest = await utils.valSales.crcs.list.fetch();
      onSelect(latest.find(crc => crc.isActive && crc.id !== input.id)?.id ?? "");
      toast.success("CRC retirada da equipe", { description: "Pacientes, vendas, fotos e comissões foram preservados. Consulte em CRCs retiradas." });
    },
    onError: error => toast.error(error.message),
  });
  const restore = trpc.valSales.crcs.restore.useMutation({
    onSuccess: async (_result, input) => { await utils.valSales.crcs.list.invalidate(); onSelect(input.id); setHistoryOpen(false); toast.success("CRC reativada", { description: "O cadastro voltou à equipe com o mesmo histórico e foto." }); },
    onError: error => toast.error(error.message),
  });
  const busy = remove.isPending || restore.isPending;
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (target) remove.mutate({ id: target.id, password });
  }
  return <>
    <div className="flex flex-wrap gap-2">
      {isAdmin && selected?.isActive && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setTarget(selected); setPassword(""); }} className="border-[#e4c8c8] bg-white text-[#a14f4f] hover:bg-red-50"><Archive className="mr-1.5 h-4 w-4" />Retirar CRC</Button>}
      {isAdmin && selected && !selected.isActive && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => restore.mutate({ id: selected.id })} className="bg-white text-[#2e718f]"><RotateCcw className="mr-1.5 h-4 w-4" />Reativar CRC</Button>}
      {removed.length > 0 && <Button type="button" size="sm" variant="outline" onClick={() => setHistoryOpen(true)} className="bg-white text-[#617782]"><History className="mr-1.5 h-4 w-4" />CRCs retiradas ({removed.length})</Button>}
    </div>
    <Dialog open={target !== null} onOpenChange={open => { if (!open && !remove.isPending) { setTarget(null); setPassword(""); } }}>
      <DialogContent className="bg-white sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-[#174f6f]">Retirar CRC · {target?.name}</DialogTitle><DialogDescription>A CRC deixará as abas da equipe e não poderá receber novos registros. Esta ação pode ser desfeita em “CRCs retiradas”.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl border border-[#d8e5eb] bg-[#f3f8fb] p-4 text-sm text-[#486a7b]"><strong>Não serão apagados</strong> pacientes, vendas, comissão, fotos, tarefas ou agendamentos de <strong>{target?.name}</strong>. Os totais históricos da equipe permanecem iguais.</div>
          <label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">Senha provisória *<Input type="password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} required maxLength={128} placeholder="Digite a senha para confirmar" disabled={remove.isPending} /></label>
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setTarget(null); setPassword(""); }} disabled={remove.isPending}>Cancelar</Button><Button type="submit" variant="destructive" disabled={remove.isPending}>{remove.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}Confirmar retirada</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-white sm:max-w-xl">
        <DialogHeader><DialogTitle>CRCs retiradas · Odontomab</DialogTitle><DialogDescription>Consulte as vendas, a comissão e os indicadores anteriores. Reative o cadastro para voltar a registrar dados dessa CRC.</DialogDescription></DialogHeader>
        <div className="space-y-3">{removed.map(crc => <div key={crc.id} className="flex flex-col gap-3 rounded-xl border border-[#d8e5eb] p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f4f8] text-[#2e718f]">{crc.photoUrl ? <img src={crc.photoUrl} alt="" className="h-full w-full object-cover object-top" /> : crc.name.slice(0, 1)}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-[#174f6f]">{crc.name}</p><p className="text-xs text-[#7d8d95]">Histórico preservado</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { onSelect(crc.id); setHistoryOpen(false); }}>Ver histórico</Button>{isAdmin && <Button type="button" size="sm" disabled={busy} onClick={() => restore.mutate({ id: crc.id })} className="bg-[#2e7da3] hover:bg-[#246989]"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reativar</Button>}</div></div>)}</div>
      </DialogContent>
    </Dialog>
  </>;
}
