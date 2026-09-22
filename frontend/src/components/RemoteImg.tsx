import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Картинки живут на внешнем CDN застройщика: он бывает медленным, а из части
 * сетей недоступен совсем. Обычный <img> в таком случае навсегда остаётся
 * пустым прямоугольником — здесь вместо этого показываем нейтральную плашку,
 * а сами картинки всегда грузятся лениво и не держат отрисовку страницы.
 */
export function RemoteImg({
  src,
  alt = "",
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);

  if (!src || failed)
    return <span aria-hidden className={cn("bg-secondary", className)} />;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
}
