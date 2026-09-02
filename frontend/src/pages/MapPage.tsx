import "leaflet/dist/leaflet.css";
import { Star } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { ApartSheet } from "@/components/ApartSheet";
import { ApartsTable } from "@/components/ApartsTable";
import { Button } from "@/components/ui/button";
import { useAparts } from "@/hooks/useAparts";
import { useBuildings } from "@/hooks/useBuildings";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { pointInPolygon, type LatLng } from "@/lib/geo";
import type { ApartRow, BuildingRow } from "@/lib/types";

const MOSCOW: LatLng = [55.751, 37.618];

function DrawLayer({
  drawing,
  points,
  addPoint,
}: {
  drawing: boolean;
  points: LatLng[];
  addPoint: (p: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (drawing) addPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  if (points.length < 2) return null;
  return drawing ? (
    <Polyline positions={points} pathOptions={{ color: "var(--primary)", dashArray: "6" }} />
  ) : (
    <Polygon
      positions={points}
      pathOptions={{ color: "var(--primary)", fillOpacity: 0.08 }}
    />
  );
}

export function MapPage() {
  const { data: buildings } = useBuildings();
  const toggle = useToggleFavorite();

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [applied, setApplied] = useState<LatLng[] | null>(null);
  const [selected, setSelected] = useState<ApartRow | null>(null);

  const withCoords = useMemo(
    () =>
      (buildings ?? []).filter(
        (b): b is BuildingRow & { latitude: number; longitude: number } =>
          b.latitude != null && b.longitude != null,
      ),
    [buildings],
  );

  const inZone = useMemo(() => {
    if (!applied || applied.length < 3) return null;
    return withCoords.filter((b) =>
      pointInPolygon([b.latitude, b.longitude], applied),
    );
  }, [applied, withCoords]);

  const buildingIds = inZone?.map((b) => b.building_id).join(",");
  const aparts = useAparts({ building_ids: buildingIds }, !!buildingIds);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3 md:px-8">
        <h1 className="mr-2 text-lg font-semibold">Карта</h1>
        <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full ring-2 ring-primary" />
          дом с квартирой в избранном
        </span>
        {!drawing && !applied && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDrawing(true);
              setPoints([]);
            }}
          >
            Выделить район
          </Button>
        )}
        {drawing && (
          <>
            <span className="text-sm text-muted-foreground">
              Кликайте по карте по контуру района, затем «Готово»
            </span>
            <Button size="sm" disabled={points.length < 3} onClick={() => { setDrawing(false); setApplied(points); }}>
              Готово ({points.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setDrawing(false); setPoints([]); }}>
              Отмена
            </Button>
          </>
        )}
        {applied && (
          <>
            <span className="tnum text-sm text-muted-foreground">
              {inZone?.length ?? 0} домов · {aparts.data?.length ?? 0} квартир
            </span>
            <Button size="sm" variant="ghost" onClick={() => { setApplied(null); setPoints([]); }}>
              Сбросить
            </Button>
          </>
        )}
      </div>

      <div className="h-[55vh] w-full">
        <MapContainer center={MOSCOW} zoom={10} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          <DrawLayer
            drawing={drawing}
            points={points}
            addPoint={(p) => setPoints((prev) => [...prev, p])}
          />
          {withCoords.map((b) => {
            const dim = inZone && !inZone.some((x) => x.building_id === b.building_id);
            const fav = b.favorites_count > 0;
            return (
              <CircleMarker
                key={b.building_id}
                center={[b.latitude, b.longitude]}
                radius={fav ? 8 : 6}
                pathOptions={{
                  color: fav ? "var(--primary)" : "var(--muted-foreground)",
                  weight: fav ? 3 : 1.5,
                  fillColor: dim ? "var(--muted-foreground)" : "var(--primary)",
                  fillOpacity: dim ? 0.2 : fav ? 0.85 : 0.55,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    <div className="text-sm font-semibold">{b.address}</div>
                    <div className="text-muted-foreground">{b.status_label}</div>
                    {b.favorites_count > 0 && (
                      <div className="flex items-center gap-1 text-primary">
                        <Star size={11} className="fill-primary" />
                        {b.favorites_count} в избранном
                      </div>
                    )}
                    <Link
                      to={`/buildings/${b.building_id}`}
                      className="mt-1 inline-block font-medium text-primary underline"
                    >
                      Открыть дом →
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="space-y-3 p-5 md:p-8">
        {!applied && (
          <p className="text-sm text-muted-foreground">
            Нажмите «Выделить район», обведите его кликами по карте — ниже покажутся
            квартиры в его границах.
          </p>
        )}
        {applied && aparts.data && aparts.data.length > 0 && (
          <ApartsTable
            rows={aparts.data}
            selectedId={selected?.new_apart_id}
            onToggleFavorite={(id, next) => toggle.mutate({ id, next })}
            onSelect={setSelected}
          />
        )}
        {applied && inZone?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            В этой области нет домов.
          </p>
        )}
      </div>

      <ApartSheet
        apart={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
