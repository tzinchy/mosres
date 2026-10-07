import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PlateMaskInput, validateMask } from "@/components/PlateMaskInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddPlateWatch,
  useDeletePlateWatch,
  usePlatePresets,
  usePlateWatches,
} from "@/hooks/usePlateWatches";
import { shortDate } from "@/lib/format";

export function PlateWatchesPage() {
  const { data: watches, isLoading } = usePlateWatches();
  const { data: presets } = usePlatePresets();
  const add = useAddPlateWatch();
  const del = useDeletePlateWatch();
  const [mask, setMask] = useState("");
  const [label, setLabel] = useState("");

  const valid = validateMask(mask).ok;
  const submit = () => {
    if (!valid) return;
    add.mutate(
      { mask, label: label || undefined },
      { onSuccess: () => { setMask(""); setLabel(""); } },
    );
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-5 p-5 md:p-8">
      <div>
        <h1 className="text-lg font-semibold">Номера</h1>
        <p className="text-sm text-muted-foreground">
          Паттерн срабатывает, когда на торгах появляется лот с подходящим
          госномером. Попадания видны в таблице машин и в уведомлениях.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-medium">Новый паттерн</h2>
        <PlateMaskInput value={mask} onChange={setMask} onSubmit={submit} />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={label}
            placeholder="Название (необязательно)"
            onChange={(e) => setLabel(e.target.value)}
            className="h-9 w-56"
          />
          <Button
            size="sm"
            className="h-9"
            disabled={!valid || add.isPending}
            onClick={submit}
          >
            <Plus size={14} className="mr-1.5" />
            Добавить
          </Button>
        </div>

        {presets && presets.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Готовые правила — то, что маской не выразить (зеркальные номера,
              блатные серии):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.preset}
                  type="button"
                  disabled={add.isPending}
                  onClick={() => add.mutate({ preset: p.preset })}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

      {watches && watches.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          Паттернов пока нет. Добавьте маску или нажмите готовое правило — и
          подходящие лоты сразу подсветятся в таблице машин.
        </p>
      )}

      {watches && watches.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {watches.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {w.mask ? (
                    <span className="font-mono text-sm font-medium tracking-widest">
                      {w.mask}
                    </span>
                  ) : (
                    <span className="text-sm font-medium">
                      {w.label ?? "готовое правило"}
                    </span>
                  )}
                  {w.mask && w.label && (
                    <span className="text-sm text-muted-foreground">{w.label}</span>
                  )}
                  {!w.mask && (
                    <Badge className="border-transparent bg-secondary text-secondary-foreground">
                      пресет
                    </Badge>
                  )}
                </div>
                <div className="tnum mt-0.5 text-xs text-muted-foreground">
                  добавлен {shortDate(w.created_at)}
                </div>
              </div>

              <Link
                to="/torgi/cars?watch_only=1"
                className="shrink-0 text-xs text-primary hover:underline"
                title="Показать лоты под мои паттерны"
              >
                <Badge className="tnum border-transparent bg-primary/15 text-primary">
                  {w.matched_now} совпад.
                </Badge>
              </Link>

              <button
                type="button"
                onClick={() => del.mutate(w.id)}
                disabled={del.isPending}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-neg"
                aria-label="Удалить паттерн"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {watches && watches.length > 0 && (
        <Link
          to="/torgi/cars?watch_only=1"
          className="inline-block text-sm text-primary hover:underline"
        >
          Показать все лоты под мои паттерны →
        </Link>
      )}
    </div>
  );
}
