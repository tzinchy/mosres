import { ChevronDown, Info } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dashboard section with a collapse toggle; open/closed state persists per title. */
export function Section({
  title,
  help,
  right,
  children,
  defaultOpen = true,
}: {
  title: string;
  help?: string;
  right?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const key = `mosres-dash:${title}`;
  const [open, setOpen] = useState(() => {
    const v = localStorage.getItem(key);
    return v === null ? defaultOpen : v === "1";
  });
  useEffect(() => {
    localStorage.setItem(key, open ? "1" : "0");
  }, [open, key]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80"
        >
          <ChevronDown
            size={14}
            className={cn(
              "text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          {title}
          {help && (
            <span
              title={help}
              onClick={(e) => e.stopPropagation()}
              className="cursor-help text-muted-foreground"
            >
              <Info size={13} />
            </span>
          )}
        </button>
        {open && right}
      </div>
      {open && children}
    </section>
  );
}
