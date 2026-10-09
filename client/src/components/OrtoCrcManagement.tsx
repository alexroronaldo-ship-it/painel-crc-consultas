import { useAuth } from "@/_core/hooks/useAuth";
import CrcTransferDialog from "@/components/CrcTransferDialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
export default function OrtoCrcManagement({
  scope,
  crcs,
  selectedId,
  onSelect,
}: {
  scope: "funnel" | "ortho_active";
  crcs: Array<{ id: string; name: string; isActive: boolean }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const restore = trpc.crcTransfers.restoreOrto.useMutation({
    onSuccess: async (_result, input) => {
      await utils.crcTransfers.ortoList.invalidate();
      onSelect(input.crcId);
      toast.success("CRC reativada nesta página", {
        description: "A reativação não desfaz transferências já realizadas.",
      });
    },
    onError: error => toast.error(error.message),
  });
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[#d8e5eb] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-[#486a7b]">
          Gestão da equipe · somente esta página
        </p>
        <p className="text-[11px] text-[#7d8d95]">
          Transfira pacientes e valores para outra CRC sem apagar registros.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CrcTransferDialog
          scope={scope}
          crcs={crcs}
          initialSourceId={selectedId}
          onTransferred={onSelect}
        />
        {crcs
          .filter(crc => !crc.isActive)
          .map(crc => (
            <div key={crc.id} className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onSelect(crc.id)}
                className="text-[#617782]"
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                Histórico · {crc.name}
              </Button>
              {user?.role === "admin" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate({
                      scope,
                      crcId: crc.id as "WISLLAYNI" | "JAYZA",
                    })
                  }
                  className="text-[#2e718f]"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reativar {crc.name}
                </Button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
