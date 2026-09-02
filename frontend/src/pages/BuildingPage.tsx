import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApartSheet } from "@/components/ApartSheet";
import { ApartsTable } from "@/components/ApartsTable";
import { BuildingPriceChart } from "@/components/BuildingPriceChart";
import { MetroList } from "@/components/MetroList";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAparts } from "@/hooks/useAparts";
import { useBuilding, useBuildingPriceDynamics } from "@/hooks/useBuilding";
import { useToggleFavorite } from "@/hooks/useFavorites";
import type { ApartRow } from "@/lib/types";

export function BuildingPage() {
  const id = Number(useParams().id);
  const { data: b } = useBuilding(id);
  const dynamics = useBuildingPriceDynamics(id);
  const aparts = useAparts({ building_id: id });
  const toggle = useToggleFavorite();
  const [selected, setSelected] = useState<ApartRow | null>(null);

  return (
    <div className="space-y-6 p-5 md:p-8">
      <Link
        to="/aparts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> ко всем квартирам
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row">
        {b?.img_url && (
          <img
            src={b.img_url}
            alt=""
            className="h-40 w-full rounded-lg border border-border object-cover sm:w-64"
          />
        )}
        <div className="min-w-0 space-y-2">
          <h1 className="text-xl font-semibold">{b?.address ?? `Дом ${id}`}</h1>
          <div className="flex flex-wrap gap-1.5">
            {b?.status_label && (
              <Badge className="border-transparent bg-secondary text-secondary-foreground">
                {b.status_label}
              </Badge>
            )}
            {b?.finishing_label && (
              <Badge className="border-transparent bg-secondary text-secondary-foreground">
                {b.finishing_label}
              </Badge>
            )}
            {b?.family_hypotec === 1 && (
              <Badge className="border-transparent bg-accent text-accent-foreground">
                семейная ипотека
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {b?.floors && <span className="tnum">{b.floors} эт. · </span>}
            {b?.flats && <span className="tnum">{b.flats} кв. · </span>}
            {b?.vvod && <span>ввод {b.vvod}</span>}
          </div>
          {b && b.metro.length > 0 && <MetroList stops={b.metro} limit={4} />}
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium">Цена за квадратный метр</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          По снимкам данных за прошедшие дни
        </p>
        {dynamics.isLoading && <Skeleton className="h-64 w-full" />}
        {dynamics.data && dynamics.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ещё нет снимков цены — появятся после нескольких обновлений данных.
          </p>
        )}
        {dynamics.data && dynamics.data.length > 0 && (
          <BuildingPriceChart points={dynamics.data} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Квартиры в доме</h2>
        {aparts.data && (
          <ApartsTable
            rows={aparts.data}
            selectedId={selected?.new_apart_id}
            onToggleFavorite={(aid, next) => toggle.mutate({ id: aid, next })}
            onSelect={setSelected}
          />
        )}
      </section>

      <ApartSheet
        apart={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
