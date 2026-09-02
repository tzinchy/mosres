import { Link, useParams } from "react-router-dom";
import { ApartsTable } from "@/components/ApartsTable";
import { BuildingPriceChart } from "@/components/BuildingPriceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAparts } from "@/hooks/useAparts";
import { useBuilding, useBuildingPriceDynamics } from "@/hooks/useBuilding";
import { useBuildingVersions } from "@/hooks/useBuildingVersions";
import { useToggleFavorite } from "@/hooks/useFavorites";

export function BuildingPage() {
  const id = Number(useParams().id);
  const building = useBuilding(id);
  const dynamics = useBuildingPriceDynamics(id);
  const versions = useBuildingVersions(id);
  const aparts = useAparts({ building_id: id });
  const toggle = useToggleFavorite();

  return (
    <div className="space-y-6 p-6">
      <Link to="/" className="text-sm underline">
        ← ко всем квартирам
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{building.data?.address ?? `Дом ${id}`}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Статус: {building.data?.status_code ?? "—"} · Ввод:{" "}
          {building.data?.vvod ?? "—"} · Метро:{" "}
          {building.data?.metro?.join(", ") ?? "—"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дом</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="price">
            <TabsList>
              <TabsTrigger value="price">Цена за м²</TabsTrigger>
              <TabsTrigger value="history">История дома</TabsTrigger>
            </TabsList>
            <TabsContent value="price" className="pt-4">
              {dynamics.isLoading && <div>Загрузка…</div>}
              {dynamics.data && dynamics.data.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Ещё нет снимков цены.
                </div>
              )}
              {dynamics.data && dynamics.data.length > 0 && (
                <BuildingPriceChart points={dynamics.data} />
              )}
            </TabsContent>
            <TabsContent value="history" className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Версия</TableHead>
                      <TableHead>Обновлено</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Отделка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(versions.data ?? []).map((v) => (
                      <TableRow key={v.version}>
                        <TableCell>{v.version}</TableCell>
                        <TableCell>
                          {new Date(v.updated_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell>{v.status_code ?? "—"}</TableCell>
                        <TableCell>{v.finishing_code ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Квартиры дома</CardTitle>
        </CardHeader>
        <CardContent>
          {aparts.data && (
            <ApartsTable
              rows={aparts.data}
              onToggleFavorite={(aid, next) => toggle.mutate({ id: aid, next })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
