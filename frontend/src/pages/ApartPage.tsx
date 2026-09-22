import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApartDetails } from "@/components/ApartDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { useApart } from "@/hooks/useAparts";

export function ApartPage() {
  const { id } = useParams();
  const { data: apart, isLoading, isError } = useApart(Number(id));

  return (
    <div className="space-y-4">
      <Link
        to="/aparts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> ко всем квартирам
      </Link>

      {isLoading && <Skeleton className="mx-auto h-96 w-full max-w-[560px]" />}
      {isError && <p className="text-sm text-muted-foreground">Квартира не найдена.</p>}
      {apart && <ApartDetails apart={apart} />}
    </div>
  );
}
