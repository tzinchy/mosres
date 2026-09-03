import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Text-backed numeric input. No spinner arrows, no stuck leading zero, no
 * negative overflow. Keeps a local string so mid-typing states ("1.", "") are
 * not stomped by re-formatting; clamps to [min, max] on blur.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  className,
  placeholder,
  inputMode = "decimal",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}) {
  const [text, setText] = useState(() => (value ? String(value) : ""));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value ? String(value) : "");
  }, [value]);

  return (
    <input
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
        setText(raw);
        const n = Number(raw);
        if (raw !== "" && Number.isFinite(n))
          onChange(Math.min(max, Math.max(min, n)));
      }}
      onBlur={() => {
        focused.current = false;
        const n = Number(text.replace(",", "."));
        const v =
          text.trim() === "" || !Number.isFinite(n)
            ? min
            : Math.min(max, Math.max(min, n));
        onChange(v);
        setText(v ? String(v) : "");
      }}
      className={cn(
        "tnum rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring",
        className,
      )}
    />
  );
}
