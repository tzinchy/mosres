import type { TorgiTopLot, TorgiTopViewLot } from "@/hooks/useTorgiDashboard";
import { money, moneyShort, pct } from "@/lib/format";
import { Empty, LotList, LotRow, Panel } from "@/components/torgi/parts";
import { cn } from "@/lib/utils";

function PriceTops({
  title,
  help,
  rows,
  tone,
}: {
  title: string;
  help: string;
  rows: TorgiTopLot[];
  tone: "pos" | "neg";
}) {
  return (
    <Panel title={title} help={help}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <LotList>
          {rows.map((r) => (
            <LotRow
              key={r.lot_id}
              lotId={r.lot_id}
              title={r.name}
              sub={
                tone === "pos"
                  ? `${moneyShort(r.prev_start_price)} → ${moneyShort(r.start_price)} ₽`
                  : `${moneyShort(r.start_price)} → ${moneyShort(r.final_price)} ₽`
              }
              right={
                <span
                  className={cn(
                    "tnum text-xs",
                    tone === "pos" ? "text-pos" : "text-neg",
                  )}
                >
                  {pct(r.delta_pct)}
                </span>
              }
            />
          ))}
        </LotList>
      )}
    </Panel>
  );
}

export function TorgiTopLots({
  drop,
  premium,
  views,
}: {
  drop: TorgiTopLot[];
  premium: TorgiTopLot[];
  views: TorgiTopViewLot[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <PriceTops
        title="Максимальное падение начальной"
        help="Лоты, у которых начальная цена сильнее всего упала по сравнению с прошлой версией."
        rows={drop}
        tone="pos"
      />
      <PriceTops
        title="Максимальная наценка на торгах"
        help="Лоты, у которых итоговая цена сильнее всего превысила начальную."
        rows={premium}
        tone="neg"
      />
      <Panel
        title="Самые просматриваемые"
        help="Лоты с наибольшим числом просмотров на портале торгов."
      >
        {views.length === 0 ? (
          <Empty />
        ) : (
          <LotList>
            {views.map((r) => (
              <LotRow
                key={r.lot_id}
                lotId={r.lot_id}
                title={r.name}
                sub={`${money(r.start_price)} ₽`}
                right={
                  <span className="tnum text-xs text-muted-foreground">
                    {r.portal_views === null || r.portal_views === undefined
                      ? "—"
                      : `${r.portal_views.toLocaleString("ru-RU")} просм.`}
                  </span>
                }
              />
            ))}
          </LotList>
        )}
      </Panel>
    </div>
  );
}
