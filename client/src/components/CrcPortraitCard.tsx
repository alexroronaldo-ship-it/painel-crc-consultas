import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Camera, Loader2, UploadCloud, UserRound } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type CrcName = "WISLLAYNI" | "JAYZA" | "VAL";
const validTypes = ["image/jpeg", "image/png", "image/webp"];

export default function CrcPortraitCard({ crcName, displayName, commission, revenue, month, photoUrl }: {
  crcName: CrcName;
  displayName: string;
  commission?: number;
  revenue?: number;
  month: string;
  photoUrl?: string;
}) {
  const inputId = useId();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const upload = trpc.crcProfiles.uploadPhoto.useMutation({
    onSuccess: async () => {
      await utils.crcProfiles.list.invalidate();
      toast.success(`Foto de ${displayName} atualizada`);
    },
    onError: error => toast.error(error.message),
  });

  async function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!validTypes.includes(file.type)) return toast.error("Use uma foto JPG, PNG ou WebP");
    if (file.size > 2 * 1024 * 1024 || file.size === 0) return toast.error("A foto deve ter até 2 MB");
    let base64: string;
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Não foi possível ler a foto"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      base64 = result.split(",")[1];
      if (!base64) throw new Error("Arquivo de foto inválido");
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível ler a foto");
    }
    upload.mutate({ crcName, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64 });
  }

  return <Card className="h-full border-[#cddfe8] bg-white shadow-sm">
    <CardContent className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2e7da3]">Perfil da CRC</p><h3 className="mt-1 text-lg font-semibold text-[#174f6f]">{displayName}</h3></div>
        <Camera className="h-5 w-5 text-[#7da1b3]" aria-hidden="true" />
      </div>
      <div className="relative flex min-h-[230px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#b7d2df] bg-[#f4f9fb] sm:min-h-[270px]">
        {photoUrl ? <img key={photoUrl} src={photoUrl} alt={`Foto profissional de ${displayName}`} className="absolute inset-0 h-full w-full object-cover object-top" /> : <div className="px-5 text-center text-[#7390a0]"><UserRound className="mx-auto mb-3 h-12 w-12 text-[#9cbac9]" aria-hidden="true" /><p className="text-sm font-medium">Foto de {displayName}</p><p className="mt-1 text-xs">Espaço reservado para a foto profissional</p></div>}
      </div>
      {user?.role === "admin" && <div className="mt-3"><input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoSelected} disabled={upload.isPending} className="sr-only" aria-label={`Selecionar foto profissional de ${displayName}`} /><Button type="button" variant="outline" className="w-full border-[#c9dfe8] text-[#2e718f] hover:bg-[#eef7fa]" disabled={upload.isPending} onClick={() => document.getElementById(inputId)?.click()}>{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}{photoUrl ? "Trocar foto" : "Adicionar foto"}</Button><p className="mt-1.5 text-center text-[11px] text-[#8b989d]">JPG, PNG ou WebP · até 2 MB</p></div>}
      <div className="mt-5 rounded-xl bg-[#e8f4f8] p-4" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-[#486a7b]">{commission === undefined ? "Vendas" : "Comissão"} {month ? "do mês" : "de todo o período"}</p><p className="mt-1 break-words text-3xl font-bold tracking-tight text-[#176187]">{currency.format(commission ?? revenue ?? 0)}</p><p className="mt-1 text-xs text-[#6e7f88]">{commission === undefined ? `Vendas próprias de ${displayName}, separadas do Funil de Vendas Orto Implante.` : `Calculada sobre as vendas de ${displayName}${month ? " no período selecionado" : ""}.`}</p></div>
    </CardContent>
  </Card>;
}
