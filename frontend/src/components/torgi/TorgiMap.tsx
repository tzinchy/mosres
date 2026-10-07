import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiPoints, type TorgiPoint } from "@/hooks/useTorgiDashboard";
import { money } from "@/lib/format";
import { Empty, Panel } from "@/components/torgi/parts";

const MOSCOW: [number, number] = [55.751, 37.618];

type Located = TorgiPoint & { latitude: number; longitude: number };

export function TorgiMap() {
  const { data, isLoading } = useTorgiPoints();

  const located = useMemo(
    () =>
      (data ?? []).filter(
        (p): p is Located => p.latitude != null && p.longitude != null,
      ),
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
              center={[p.latitude, p.longitude]}
              radius={p.is_open ? 8 : 6}
              pathOptions={{
                color: p.is_open ? "var(--pos)" : "var(--muted-foreground)",
                weight: p.is_open ? 3 : 1.5,
                fillColor: p.is_open ? "var(--pos)" : "var(--primary)",
                fillOpacity: p.is_open ? 0.8 : 0.45,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="text-sm font-semibold">
                    {p.name || `Лот ${p.lot_id}`}
                  </div>
                  <div className="text-muted-foreground">
                    {[p.brand, p.model, p.year].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="tnum">
                    {money(p.start_price)} ₽
                    {p.final_price ? ` → ${money(p.final_price)} ₽` : ""}
                  </div>
                  <div className="text-muted-foreground">
                    {p.status_text || "—"}
                    {p.plate_norm ? ` · ${p.plate_norm}` : ""}
                  </div>
                  <Link
                    to={`/torgi/cars/${p.lot_id}`}
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
        приём заявок открыт · {located.length.toLocaleString("ru-RU")} лотов с
        координатами
      </p>
    </div>
  );
}
