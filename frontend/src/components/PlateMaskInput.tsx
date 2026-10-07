import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Буквы, которые вообще бывают в российских номерах. */
export const PLATE_LETTERS = "АВЕКМНОРСТУХ";
const HOMOGLYPHS: Record<string, string> = {
  A: "А",
  B: "В",
  E: "Е",
  K: "К",
  M: "М",
  H: "Н",
  O: "О",
  P: "Р",
  C: "С",
  T: "Т",
  Y: "У",
  X: "Х",
};
const MAX_LEN = 12;

export const MASK_LEGEND: { ch: string; text: string }[] = [
  { ch: "?", text: `любая буква из ${PLATE_LETTERS}` },
  { ch: "#", text: "любая цифра" },
  { ch: "=", text: "повтор предыдущего символа" },
  { ch: "*", text: "любой остаток номера" },
  { ch: "А1", text: "буква или цифра — буквально" },
];

export const MASK_EXAMPLES: { mask: string; text: string }[] = [
  { mask: "?###??*", text: "формат легкового" },
  { mask: "?#==??*", text: "три одинаковые цифры" },
  { mask: "?777??*", text: "номер с 777" },
  { mask: "*77", text: "регион 77" },
  { mask: "?###МР*", text: "серия **МР" },
  { mask: "А001АА77", text: "точный номер" },
];

/** Латиница → кириллица и верхний регистр: как это делает бэкенд с номером. */
export function normalizeMask(raw: string): string {
  return [...raw.toUpperCase()].map((c) => HOMOGLYPHS[c] ?? c).join("");
}

export type MaskCheck = { ok: true } | { ok: false; error: string };

/**
 * Живая валидация маски — те же правила, что у `mask_to_regex` на бэкенде,
 * чтобы не отправлять заведомо кривой запрос ради 422.
 */
export function validateMask(mask: string): MaskCheck {
  if (!mask) return { ok: false, error: "Пустая маска" };
  if (mask.length > MAX_LEN)
    return { ok: false, error: `Слишком длинно: максимум ${MAX_LEN} символов` };
  if (mask[0] === "=")
    return { ok: false, error: "«=» не может быть первым символом — нечего повторять" };
  for (const c of mask) {
    if ("?#=*".includes(c)) continue;
    if (c >= "0" && c <= "9") continue;
    if (PLATE_LETTERS.includes(c)) continue;
    return {
      ok: false,
      error: `Символ «${c}» нельзя использовать: буквы только из ${PLATE_LETTERS}`,
    };
  }
  return { ok: true };
}

/** Поле ввода маски с легендой символов, примерами и живой проверкой. */
export function PlateMaskInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
}) {
  const check = validateMask(value);
  const showError = value.length > 0 && !check.ok;

  return (
    <div className="space-y-2">
      <Input
        value={value}
        placeholder="?###??*"
        spellCheck={false}
        autoCapitalize="characters"
        onChange={(e) => onChange(normalizeMask(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && check.ok) onSubmit?.();
        }}
        className={cn(
          "h-9 font-mono tracking-widest",
          showError && "border-neg focus-visible:ring-neg/30",
        )}
      />
      <p className={cn("text-xs", showError ? "text-neg" : "text-muted-foreground")}>
        {showError
          ? (check as { error: string }).error
          : "Буква или цифра означает саму себя, латиница сама станет кириллицей."}
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
        {MASK_LEGEND.map((l) => (
          <div key={l.ch} className="col-span-2 flex items-baseline gap-2">
            <dt className="w-8 shrink-0 font-mono text-foreground">{l.ch}</dt>
            <dd className="text-muted-foreground">{l.text}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {MASK_EXAMPLES.map((e) => (
          <button
            key={e.mask}
            type="button"
            onClick={() => onChange(e.mask)}
            title={e.text}
            className="rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            {e.mask}
          </button>
        ))}
      </div>
    </div>
  );
}
