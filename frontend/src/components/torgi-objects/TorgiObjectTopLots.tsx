import { Empty, LotList, Panel } from "@/components/torgi/parts";
import { ObjectRow, views } from "@/components/torgi-objects/parts";
import { money, moneyShort, pct } from "@/lib/format";
import type { TorgiObjectTopLot } from "@/lib/types";
import { cn } from "@/lib/utils";

const where = (r: TorgiObjectTopLot) =>
  [r.object_type_name, r.short_address].filter(Boolean).join(" · ");

function PriceTops({
  title,
  help,
  rows,
  tone,
}: {
  title: string;
  help: string;
  rows: TorgiObjectTopLot[];
  tone: "pos" | "neg";
}) {
  return (
    <Panel title={title} help={help}>
      {rows.length === 0 ? (
        <Empty>
          {tone === "pos"
            ? "Снижений начальной цены пока не было."
            : "Нет данных."}
        </Empty>
      ) : (
        <LotList>
          {rows.map((r) => (
            <ObjectRow
              key={r.lot_id}
              lotId={r.lot_id}
              title={r.name}
              sub={
                <>
                  {tone === "pos"
                    ? `${moneyShort(r.prev_start_price)} → ${moneyShort(r.start_price)} ₽`
                    : `${moneyShort(r.start_price)} → ${moneyShort(r.final_price)} ₽`}
                  {where(r) ? ` · ${where(r)}` : ""}
                </>
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

export function TorgiObjectTopLots({
  drop,
  premium,
  viewsTop,
}: {
  drop: TorgiObjectTopLot[];
  premium: TorgiObjectTopLot[];
  viewsTop: TorgiObjectTopLot[];
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
        help="Лоты с наибольшим числом просмотров карточки на портале торгов."
      >
        {viewsTop.length === 0 ? (
          <Empty />
        ) : (
          <LotList>
            {viewsTop.map((r) => (
              <ObjectRow
                key={r.lot_id}
                lotId={r.lot_id}
                title={r.name}
                sub={
                  <>
                    {money(r.start_price)} ₽
                    {r.object_area ? ` · ${r.object_area} м²` : ""}
                    {where(r) ? ` · ${where(r)}` : ""}
                  </>
                }
                right={
                  <span className="tnum text-xs text-muted-foreground">
                    {views(r.portal_views)}
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
