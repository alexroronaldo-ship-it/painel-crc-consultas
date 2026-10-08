import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Crc = { id: string; name: string; photoUrl?: string | null };
export async function photoData(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use uma foto JPG, PNG ou WebP");
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error("A foto deve ter até 2 MB");
  const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Não foi possível ler a foto")); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(file); });
  return { base64, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" };
}
export default function OdontomabCrcManager({ selected, onCreated }: { selected?: Crc; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();
  const create = trpc.valSales.crcs.create.useMutation();
  const rename = trpc.valSales.crcs.rename.useMutation();
  const upload = trpc.valSales.crcs.uploadPhoto.useMutation();
  if (user?.role !== "admin") return null;
  function show(edit: boolean) { setEditing(edit); setName(edit ? selected?.name ?? "" : ""); setFile(null); setOpen(true); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    let savedId: string | undefined;
    try {
      const photo = file ? await photoData(file) : undefined;
      if (editing && selected) { await rename.mutateAsync({ id: selected.id, name }); savedId = selected.id; }
      else { const created = await create.mutateAsync({ name }); savedId = created.id; }
      if (photo) await upload.mutateAsync({ id: savedId, ...photo });
      await utils.valSales.crcs.list.invalidate();
      onCreated(savedId); setOpen(false);
      toast.success(editing ? "Cadastro da CRC atualizado" : "Nova CRC cadastrada", { description: "Vendas, comissão e indicadores são separados por CRC." });
    } catch (error) {
      if (savedId) { await utils.valSales.crcs.list.invalidate(); onCreated(savedId); setOpen(false); toast.error("Nome salvo, mas a foto não foi enviada", { description: "Use Adicionar foto no perfil para tentar novamente. Não é necessário cadastrar de novo." }); }
      else toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cadastro");
    } finally { setBusy(false); }
  }
  return <><div className="flex shrink-0 gap-2">{selected && <Button type="button" size="sm" variant="outline" onClick={() => show(true)} className="border-[#c9dfe8] bg-white text-[#2e718f]"><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar CRC</Button>}<Button type="button" size="sm" onClick={() => show(false)} className="bg-[#2e7da3] hover:bg-[#246989]"><UserPlus className="mr-1.5 h-4 w-4" />Nova CRC</Button></div><Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="bg-white sm:max-w-lg"><DialogHeader><DialogTitle>{editing ? "Editar CRC" : "Cadastrar nova CRC"} · Odontomab</DialogTitle><DialogDescription>Informe o nome e, se desejar, adicione a foto profissional. A comissão será de 0,2% das vendas desta pessoa no mês.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">Nome da CRC *<Input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={160} placeholder="Nome da profissional" disabled={busy} /></label><label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">Foto profissional · opcional<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} disabled={busy} className="h-auto py-2" /><span className="block font-normal text-[#8b989d]">JPG, PNG ou WebP · até 2 MB. Pode ser adicionada depois.</span></label><p className="rounded-xl bg-[#eef7fa] p-3 text-xs text-[#617782]">As novas CRCs aparecerão como abas. O nome pode ser corrigido sem alterar vendas, tarefas ou comissões.</p><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy} className="bg-[#2e7da3] hover:bg-[#246989]">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Salvar cadastro" : "Cadastrar CRC"}</Button></DialogFooter></form></DialogContent></Dialog></>;
}
