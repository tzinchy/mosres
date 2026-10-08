import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { Empty, Panel } from "@/components/torgi/parts";
import { views } from "@/components/torgi-objects/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiObjectPoints } from "@/hooks/useTorgiObjects";
import { money } from "@/lib/format";
import type { TorgiObjectPoint } from "@/lib/types";

const MOSCOW: [number, number] = [55.751, 37.618];

type Located = TorgiObjectPoint & { lat: number; lon: number };

/** Портал отдаёт координаты строками, иногда мусорными — отсеиваем NaN. */
function locate(p: TorgiObjectPoint): Located | null {
  const lat = Number(p.latitude);
  const lon = Number(p.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (!lat && !lon))
    return null;
  return { ...p, lat, lon };
}

export function TorgiObjectMap() {
  const { data, isLoading } = useTorgiObjectPoints();

  const located = useMemo(
    () =>
      (data ?? [])
        .map(locate)
        .filter((p): p is Located => p !== null),
    [data],
  );

  if (isLoading) return <Skeleton className="h-[55vh] w-full rounded-xl" />;
  if (located.length === 0)
    return (
      <Panel>
        <Empty>Ни у одного лота нет координат.</Empty>
      </Panel>
    );

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="h-[55vh] w-full">
        <MapContainer center={MOSCOW} zoom={10} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          {located.map((p) => (
            <CircleMarker
              key={p.lot_id}
              center={[p.lat, p.lon]}
              radius={p.is_live ? 8 : 6}
              pathOptions={{
                color: p.is_live ? "var(--pos)" : "var(--muted-foreground)",
                weight: p.is_live ? 3 : 1.5,
                fillColor: p.is_live ? "var(--pos)" : "var(--primary)",
                fillOpacity: p.is_live ? 0.8 : 0.45,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="text-sm font-semibold">
                    {p.object_type_name || `Лот ${p.lot_id}`}
                  </div>
                  <div className="text-muted-foreground">
                    {p.short_address || "—"}
                  </div>
                  <div className="tnum">
                    {money(p.start_price)} ₽
                    {p.price_per_square
                      ? ` · ${money(p.price_per_square)} ₽/м²`
                      : ""}
                  </div>
                  <div className="tnum text-muted-foreground">
                    {p.object_area ? `${p.object_area} м²` : "площадь —"}
                    {p.rooms_count ? ` · ${p.rooms_count} комн.` : ""}
                    {` · ${views(p.portal_views)}`}
                  </div>
                  <Link
                    to={`/torgi/objects/${p.lot_id}`}
                    className="mt-1 inline-block font-medium text-primary underline"
                  >
                    Открыть лот →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="flex items-center gap-1.5 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <span className="size-2.5 rounded-full ring-2 ring-pos" />
        актуальные лоты · {located.length.toLocaleString("ru-RU")} объектов с
        координатами
      </p>
    </div>
  );
}
