import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRightLeft, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Scope = "odontomab" | "funnel" | "ortho_active";
type Crc = { id: string; name: string; isActive: boolean };
const labels = {
  odontomab: "Odontomab (Ativos & Novo)",
  funnel: "Funil de Vendas Orto Implante",
  ortho_active: "Pacientes Ativos Orto Implante",
};
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export default function CrcTransferDialog({
  scope,
  crcs,
  initialSourceId,
  onTransferred,
}: {
  scope: Scope;
  crcs: Crc[];
  initialSourceId?: string;
  onTransferred: (targetId: string) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedRevision, setConfirmedRevision] = useState("");
  const utils = trpc.useUtils();
  const queryInput = useMemo(
    () => ({ scope, sourceId, targetId }),
    [scope, sourceId, targetId]
  );
  const preview = trpc.crcTransfers.preview.useQuery(queryInput, {
    enabled: open && Boolean(sourceId && targetId && sourceId !== targetId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const summary = preview.data;
  const destinations = crcs.filter(crc => crc.id !== sourceId && crc.isActive);
  const source = crcs.find(crc => crc.id === sourceId),
    target = crcs.find(crc => crc.id === targetId);
  const transfer = trpc.crcTransfers.transfer.useMutation({
    onSuccess: async (result, input) => {
      setOpen(false);
      setPassword("");
      setConfirmedRevision("");
      if (scope === "odontomab") {
        await utils.valSales.invalidate();
      } else if (scope === "funnel") {
        await Promise.all([
          utils.closures.invalidate(),
          utils.crcTransfers.ortoList.invalidate(),
          utils.campaigns.invalidate(),
        ]);
      } else {
        await Promise.all([
          utils.orthoActive.invalidate(),
          utils.crcTransfers.ortoList.invalidate(),
        ]);
      }
      await utils.crcTransfers.preview.invalidate();
      onTransferred(input.targetId);
      toast.success("Transferência concluída", {
        description: `${result.recordCount} registro(s) e ${money.format(Number(result.totalValue))} transferidos para ${result.targetName}. A CRC de origem foi retirada somente desta página.`,
      });
    },
    onError: async error => {
      toast.error(error.message);
      setConfirmedRevision("");
      await preview.refetch();
    },
  });
  const canConfirm = Boolean(
    summary &&
      target?.isActive &&
      confirmedRevision === summary.revision &&
      !preview.isFetching &&
      !preview.error
  );
  function start() {
    setSourceId(
      initialSourceId && crcs.some(crc => crc.id === initialSourceId)
        ? initialSourceId
        : (crcs[0]?.id ?? "")
    );
    setTargetId("");
    setPassword("");
    setConfirmedRevision("");
    setOpen(true);
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canConfirm || !summary) return;
    transfer.mutate({
      scope,
      sourceId,
      targetId,
      password,
      revision: summary.revision,
      confirmed: true,
    });
  }
  if (user?.role !== "admin") return null;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={start}
        disabled={!crcs.length}
        className="bg-white text-[#2e718f]"
      >
        <ArrowRightLeft className="mr-1.5 h-4 w-4" />
        Transferir registros e retirar CRC
      </Button>
      <Dialog
        open={open}
        onOpenChange={value => {
          if (!transfer.isPending) {
            setOpen(value);
            if (!value) {
              setPassword("");
              setConfirmedRevision("");
            }
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#174f6f]">
              Transferir registros e retirar CRC
            </DialogTitle>
            <DialogDescription>
              {labels[scope]} · transferência apenas dentro desta página, sem
              misturar clínicas ou módulos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-[#486a7b]">
                CRC que sai *
                <select
                  value={sourceId}
                  onChange={event => {
                    setSourceId(event.target.value);
                    setTargetId("");
                    setConfirmedRevision("");
                  }}
                  required
                  disabled={transfer.isPending}
                  className="block h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"
                >
                  <option value="">Escolher origem</option>
                  {crcs.map(crc => (
                    <option key={crc.id} value={crc.id}>
                      {crc.name}
                      {!crc.isActive ? " (retirada)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#486a7b]">
                CRC que recebe *
                <select
                  value={targetId}
                  onChange={event => {
                    setTargetId(event.target.value);
                    setConfirmedRevision("");
                  }}
                  required
                  disabled={transfer.isPending}
                  className="block h-10 w-full rounded-md border border-[#d7e5ec] bg-white px-3 text-sm"
                >
                  <option value="">Escolher destino</option>
                  {destinations.map(crc => (
                    <option key={crc.id} value={crc.id}>
                      {crc.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!destinations.length && sourceId && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                É necessário ter outra CRC ativa nesta página. Cadastre ou
                reative uma CRC antes de transferir.
              </p>
            )}
            {targetId && (
              <div
                className="rounded-xl border border-[#cddfe8] bg-[#f3f8fb] p-4"
                aria-live="polite"
              >
                {preview.isFetching ? (
                  <p className="flex items-center gap-2 text-sm text-[#617782]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Conferindo todos os registros...
                  </p>
                ) : preview.error ? (
                  <div role="alert" className="text-sm text-red-800">
                    {preview.error.message}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 block"
                      onClick={() => {
                        setConfirmedRevision("");
                        preview.refetch();
                      }}
                    >
                      Atualizar resumo
                    </Button>
                  </div>
                ) : summary ? (
                  <>
                    <p className="text-xs font-semibold uppercase text-[#617782]">
                      Resumo · todos os meses
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#174f6f]">
                      {summary.sourceName} → {summary.targetName}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[#6e7f88]">
                          Registros de pacientes / vendas
                        </p>
                        <p className="text-2xl font-semibold text-[#174f6f]">
                          {summary.recordCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6e7f88]">
                          Valor total preservado
                        </p>
                        <p className="break-words text-2xl font-semibold text-[#2e7da3]">
                          {money.format(Number(summary.totalValue))}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setConfirmedRevision("");
                        preview.refetch();
                      }}
                      className="mt-2 text-[#617782]"
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Atualizar resumo
                    </Button>
                  </>
                ) : null}
              </div>
            )}
            <div className="space-y-2 rounded-xl border border-[#ead7a8] bg-[#fff9eb] p-4 text-xs leading-5 text-[#83651f]">
              <p>
                <strong>O que muda:</strong> todos os pacientes e valores da
                origem passam para a CRC de destino, em suas datas e meses
                originais. Comissão, vendas e progresso serão recalculados pela
                regra desta página. O total de vendas da equipe não muda.
              </p>
              <p>
                <strong>O que é preservado:</strong> nomes, telefones, valores,
                datas, campanhas, convênios, fotos dos pacientes e autoria ficam
                intactos. Fotos profissionais, metas pessoais, tarefas e agenda
                não passam para outra pessoa.
              </p>
              <p>
                A CRC de origem sai das abas e dos novos lançamentos desta
                página. Reativar o perfil não desfaz a transferência. A autoria
                anterior fica registrada na auditoria.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm text-[#486a7b]">
              <Checkbox
                checked={Boolean(
                  summary && confirmedRevision === summary.revision
                )}
                disabled={
                  !summary ||
                  preview.isFetching ||
                  Boolean(preview.error) ||
                  transfer.isPending
                }
                onCheckedChange={checked =>
                  setConfirmedRevision(
                    checked === true && summary ? summary.revision : ""
                  )
                }
              />
              <span>
                Confirmo a transferência de{" "}
                <strong>{source?.name ?? "origem"}</strong> para{" "}
                <strong>{target?.name ?? "destino"}</strong> em todos os meses e
                a retirada da CRC de origem.
              </span>
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-[#486a7b]">
              Senha provisória *
              <Input
                type="password"
                autoComplete="off"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                maxLength={128}
                disabled={transfer.isPending}
                placeholder="Digite a senha para confirmar"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={transfer.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!canConfirm || transfer.isPending}
                className="bg-[#2e7da3] hover:bg-[#246989]"
              >
                {transfer.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                )}
                Confirmar transferência e retirada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
