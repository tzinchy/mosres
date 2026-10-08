import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RemoteImg } from "@/components/RemoteImg";
import { cn } from "@/lib/utils";

/** Галерея как на Циане: мозаика (одно большое фото и до четырёх малых,
 *  на последнем — «ещё N»), клик открывает просмотр на весь экран со
 *  стрелками, клавиатурой и лентой миниатюр. */
export function Gallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;

  const tiles = photos.slice(0, 5);
  const rest = photos.length - tiles.length;
  // мозаика 4×2: большое фото — две колонки на две строки, остальные — по ячейке.
  // Фото меньше пяти растягиваем, чтобы в сетке не было дыр.
  const span = (idx: number): string => {
    if (idx === 0) return tiles.length === 1 ? "col-span-4 row-span-2" : tiles.length === 2 ? "col-span-2 row-span-2" : "col-span-2 row-span-2";
    if (tiles.length === 2) return "col-span-2 row-span-2";
    if (tiles.length === 3) return "col-span-2";
    if (tiles.length === 4) return idx === 1 ? "col-span-2" : "";
    return "";
  };

  return (
    <>
      <div className="relative grid h-64 grid-cols-4 grid-rows-2 gap-1 overflow-hidden rounded-xl sm:h-80 lg:h-[26rem]">
        {tiles.map((src, idx) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(idx)}
            aria-label={`Открыть фото ${idx + 1}`}
            className={cn(
              "group relative overflow-hidden bg-secondary",
              span(idx),
              // на узком экране — только большое фото
              idx > 0 && "hidden sm:block",
              idx === 0 && "max-sm:col-span-4 max-sm:row-span-2",
            )}
          >
            <RemoteImg
              src={src}
              alt={`Фото ${idx + 1}`}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {idx === tiles.length - 1 && rest > 0 && (
              <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-sm font-medium text-white sm:flex">
                ещё {rest} фото
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-background"
        >
          <Images size={14} /> Все фото · {photos.length}
        </button>
      </div>
      {open !== null && (
        <Lightbox photos={photos} start={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Lightbox({
  photos,
  start,
  onClose,
}: {
  photos: string[];
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const go = useCallback(
    (d: number) => setI((n) => (n + d + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const btn =
    "absolute flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div className="relative min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <RemoteImg
          key={photos[i]}
          src={photos[i]}
          alt={`Фото ${i + 1}`}
          className="size-full object-contain"
          onClick={onClose}
        />
        <button type="button" aria-label="Закрыть" onClick={onClose} className={cn(btn, "right-4 top-4")}>
          <X size={20} />
        </button>
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Предыдущее фото" onClick={() => go(-1)} className={cn(btn, "left-4 top-1/2 -translate-y-1/2")}>
              <ChevronLeft size={22} />
            </button>
            <button type="button" aria-label="Следующее фото" onClick={() => go(1)} className={cn(btn, "right-4 top-1/2 -translate-y-1/2")}>
              <ChevronRight size={22} />
            </button>
          </>
        )}
        <span className="tnum absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur">
          {i + 1} / {photos.length}
        </span>
      </div>
      {photos.length > 1 && (
        <div
          className="flex shrink-0 gap-1.5 overflow-x-auto p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, idx) => (
            <button key={p + idx} type="button" aria-label={`Фото ${idx + 1}`} onClick={() => setI(idx)} className="shrink-0">
              <RemoteImg
                src={p}
                className={cn(
                  "block h-14 w-20 rounded-md border-2 bg-white/10 object-cover",
                  idx === i ? "border-white" : "border-transparent opacity-60 hover:opacity-100",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
