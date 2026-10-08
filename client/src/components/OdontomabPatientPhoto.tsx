import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Camera, Loader2, UserRound } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";

export default function OdontomabPatientPhoto({ id, name, photoUrl }: { id: number; name: string; photoUrl?: string | null }) {
  const inputId = useId();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const upload = trpc.valSales.uploadPatientPhoto.useMutation({
    onSuccess: async () => { await utils.valSales.list.invalidate(); toast.success(`Foto de ${name} salva`); },
    onError: error => toast.error(error.message),
  });
  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use uma foto JPG, PNG ou WebP");
    if (!file.size || file.size > 2 * 1024 * 1024) return toast.error("A foto deve ter até 2 MB");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Não foi possível ler a foto"));
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(file);
      });
      upload.mutate({ id, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64 });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao ler a foto"); }
  }
  return <div className="flex items-center gap-2"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d7e5ec] bg-[#eef7fa]">{photoUrl ? <img src={photoUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover object-top" /> : <UserRound className="h-5 w-5 text-[#8baab9]" />}</div>{user?.role === "admin" && <><input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Selecionar foto de ${name}`} disabled={upload.isPending} onChange={selectPhoto} /><Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(inputId)?.click()} disabled={upload.isPending} className="h-8 text-xs text-[#2e718f]">{upload.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Camera className="mr-1 h-3.5 w-3.5" />}{photoUrl ? "Trocar" : "Foto"}</Button></>}</div>;
}
