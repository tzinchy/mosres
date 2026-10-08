import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Section } from "@/components/dash/Section";
import { TorgiBrands } from "@/components/torgi/TorgiBrands";
import { TorgiCategories } from "@/components/torgi/TorgiCategories";
import { TorgiChanges } from "@/components/torgi/TorgiChanges";
import { TorgiDataQuality } from "@/components/torgi/TorgiDataQuality";
import { TorgiDeadlines } from "@/components/torgi/TorgiDeadlines";
import { TorgiFunnel } from "@/components/torgi/TorgiFunnel";
import { TorgiHistograms } from "@/components/torgi/TorgiHistograms";
import { TorgiKpiTiles } from "@/components/torgi/TorgiKpiTiles";
import { TorgiMap } from "@/components/torgi/TorgiMap";
import { TorgiCarsInvest } from "@/components/torgi-objects/TorgiObjectInvest";
import { TorgiPivot } from "@/components/torgi/TorgiPivot";
import { TorgiPlateFlavors } from "@/components/torgi/TorgiPlateFlavors";
import { TorgiPlateRegions } from "@/components/torgi/TorgiPlateRegions";
import { TorgiScatter } from "@/components/torgi/TorgiScatter";
import { TorgiSeasonality } from "@/components/torgi/TorgiSeasonality";
import { TorgiTimeseries } from "@/components/torgi/TorgiTimeseries";
import { TorgiTopLots } from "@/components/torgi/TorgiTopLots";
import { TorgiVersionActivity } from "@/components/torgi/TorgiVersionActivity";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiDashboard, useTorgiRefresh } from "@/hooks/useTorgiDashboard";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TorgiDashboardPage() {
  const { data: d, isLoading, isError } = useTorgiDashboard();
  const refresh = useTorgiRefresh();

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 p-5 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Сводка торгов</h1>
        <Button
          size="sm"
          variant="outline"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw
            size={14}
            className={cn(refresh.isPending && "animate-spin")}
          />
          Обновить сейчас
        </Button>
      </div>

      {isError && (
        <p className="rounded-lg border border-neg/40 bg-neg-soft px-4 py-3 text-sm">
          Не удалось загрузить сводку торгов.
        </p>
      )}

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {d && (
        <>
          <TorgiKpiTiles kpi={d.kpi} />

          <Section
            title="Где окупаются торги"
            help="Аналитика по завершённым торгам транспорта: в каких категориях и возрастных группах торги чаще всего заканчиваются продажей, где покупают без борьбы и какие живые лоты стоят дешевле того, за что уходили похожие."
          >
            <TorgiCarsInvest />
          </Section>

          <Section
            title="Категории транспорта"
            help="Разбивка лотов по категории транспорта: сколько всего, сколько в приёме заявок и продано, цены, пробег и заполненность номера."
          >
            <TorgiCategories rows={d.categories} />
          </Section>

          <Section
            title="Топ марок"
            help="15 самых частых марок. Столбец — число лотов; средняя начальная цена и средний Δ% итог/начало — в подсказке."
          >
            <TorgiBrands rows={d.brands} />
          </Section>

          <Section
            title="Воронка статусов"
            help="Ступени от приёма заявок до продажи. Длина полосы — доля от самой массовой ступени."
          >
            <TorgiFunnel rows={d.funnel} />
          </Section>

          <Section
            title="Динамика по месяцам торгов"
            help="По дате торгов: столбцы — число лотов, линия — сумма итоговых цен, пунктир — средний Δ итог/начало."
          >
            <TorgiTimeseries rows={d.timeseries} />
          </Section>

          <Section
            title="Сезонность"
            help="Сколько лотов выходит на торги в каждый месяц года — агрегат по всем годам."
          >
            <TorgiSeasonality rows={d.seasonality} />
          </Section>

          <Section
            title="Ближайшие дедлайны заявок"
            help="20 лотов, у которых скорее всего закрывается приём заявок. Красный — 3 дня и меньше, янтарный — неделя. Клик по столбцу или строке открывает лот."
          >
            <TorgiDeadlines rows={d.deadlines} />
          </Section>

          <Section
            title="Лента изменений"
            help="Последние 50 правок из истории лотов: цена, статус, появление итоговой цены. Группы раскрываются, строка ведёт в лот."
          >
            <TorgiChanges rows={d.changes} />
          </Section>

          <Section
            title="Распределения"
            help="Гистограммы: Δ итог/начало, год выпуска, пробег."
          >
            <TorgiHistograms
              discount={d.discount_hist}
              year={d.year_hist}
              mileage={d.mileage_hist}
            />
          </Section>

          <Section
            title="Топ-листы"
            help="Где сильнее всего упала начальная цена, где торги дали максимальную наценку и что чаще всего смотрят на портале."
          >
            <TorgiTopLots
              drop={d.top_drop}
              premium={d.top_premium}
              views={d.top_views}
            />
          </Section>

          <Section
            title="Свой разрез"
            help="Выберите поле для разбивки и показатель — один виджет вместо десятка графиков. В подсказке столбца видны все метрики строки."
          >
            <TorgiPivot />
          </Section>

          <Section
            title="Лоты: точки по двум осям"
            help="Каждая точка — лот. Оси и раскраска выбираются; цена за л.с. и за км пробега считаются из начальной цены."
          >
            <TorgiScatter />
          </Section>

          <Section
            title="Карта лотов"
            help="Лоты с координатами. Зелёные — приём заявок открыт. В попапе цена и ссылка на карточку."
          >
            <TorgiMap />
          </Section>

          <Section
            title="Номера: «вкус»"
            help="Сколько лотов попадает под каждый готовый пресет интересного номера."
          >
            <TorgiPlateFlavors rows={d.plate_flavors} />
          </Section>

          <Section
            title="Регионы номеров"
            help="Распределение разобранных номеров по региону. Считается на клиенте из того же массива точек."
          >
            <TorgiPlateRegions />
          </Section>

          <Section
            title="Качество данных"
            help="Доля лотов, у которых заполнено поле: номер, VIN, ПТС, фото, видео, координаты."
          >
            <TorgiDataQuality quality={d.data_quality} />
          </Section>

          <Section
            title="Активность версий"
            help="Сколько версий накопил лот и сколько правок приходило каждый день за последние 90 дней."
          >
            <TorgiVersionActivity activity={d.version_activity} />
          </Section>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Данные торгов обновлены {relTime(d?.last_refresh)}.{" "}
        <Link to="/torgi/cars" className="text-primary hover:underline">
          Таблица транспорта →
        </Link>{" "}
        <Link to="/dash/objects" className="text-primary hover:underline">
          Сводка по недвижимости →
        </Link>
      </p>
    </div>
  );
}
