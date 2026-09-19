import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  pageSize?: number;
  totalItems: number;
  label?: string;
  onPageChange: (page: number) => void;
}

export default function TablePagination({ page, pageSize = 5, totalItems, label = "atividades", onPageChange }: TablePaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-[#e3edf1] bg-[#fbfdfe] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#6e7f88]">
        Mostrando <strong className="text-[#335f76]">{startItem}–{endItem}</strong> de {totalItems} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)} className="h-8 border-[#d7e5ec] bg-white px-2.5 text-[#486a7b]">
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />Anterior
        </Button>
        <span className="min-w-16 text-center text-xs font-medium text-[#486a7b]">{safePage} de {totalPages}</span>
        <Button type="button" variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => onPageChange(safePage + 1)} className="h-8 border-[#d7e5ec] bg-white px-2.5 text-[#486a7b]">
          Próxima<ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
