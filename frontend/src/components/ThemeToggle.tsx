import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const KEY = "mosres-theme";

function apply(mode: Mode) {
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function initTheme() {
  apply((localStorage.getItem(KEY) as Mode) ?? "dark");
}

const order: Mode[] = ["system", "light", "dark"];
const icon = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(KEY) as Mode) ?? "dark",
  );

  useEffect(() => {
    apply(mode);
    localStorage.setItem(KEY, mode);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => mode === "system" && apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const Icon = icon[mode];
  return (
    <button
      type="button"
      onClick={() => setMode(order[(order.indexOf(mode) + 1) % order.length])}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      title={`Тема: ${mode}`}
    >
      <Icon size={15} />
      <span className="capitalize">{mode}</span>
    </button>
  );
}
