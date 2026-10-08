import { clearSession, getUsername } from "@/lib/auth";
import {
  Bell,
  Building2,
  ChevronRight,
  Calculator,
  Car,
  Gavel,
  Hash,
  Home,
  LayoutDashboard,
  Map as MapIcon,
  Table2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useNotifications, useStatus } from "@/hooks/useDashboard";
import { useTorgiNotifications } from "@/hooks/useTorgi";
import { useNotifSeen } from "@/hooks/useNotifSeen";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Навигация сгруппирована по источнику данных: москварталы и torgi.mos.ru. */
const groups = [
  {
    // дашборды всех источников в одной раскрывающейся группе: по одному
    // экрану на тему, чтобы разнородные сводки не сваливались в одну страницу
    title: "дашборды",
    defaultOpen: true,
    items: [
      { to: "/", label: "Торги: транспорт", icon: Gavel, end: true },
      { to: "/dash/objects", label: "Торги: недвижимость", icon: Home, end: true },
      { to: "/mosres", label: "Москварталы", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "торги",
    defaultOpen: true,
    items: [
      { to: "/torgi/objects", label: "Недвижимость", icon: Home, end: false },
      { to: "/torgi/cars", label: "Машины", icon: Car, end: false },
      { to: "/torgi/plates", label: "Номера", icon: Hash, end: false },
    ],
  },
  {
    // москварталы по умолчанию свёрнуты: основная работа идёт в торгах
    title: "mosres",
    defaultOpen: false,
    items: [
      { to: "/aparts", label: "Квартиры", icon: Table2, end: false },
      { to: "/buildings", label: "Дома", icon: Building2, end: true },
      { to: "/map", label: "Карта", icon: MapIcon, end: false },
      { to: "/mortgage", label: "Ипотека", icon: Calculator, end: false },
    ],
  },
];
const nav = groups.flatMap((g) => g.items);

function BellItem({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useNotifications();
  const torgi = useTorgiNotifications();
  const { lastSeen } = useNotifSeen();
  // один колокольчик на два источника — счётчик суммирует обе ленты
  const unread =
    (data ?? []).filter((n) => n.updated_at > lastSeen).length +
    (torgi.data ?? []).filter((n) => n.updated_at > lastSeen).length;
  return (
    <NavLink
      to="/notifications"
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )
      }
    >
      <span className="relative">
        <Bell size={16} strokeWidth={2} />
        {unread > 0 && (
          <span className="tnum absolute -top-1.5 -right-2 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </span>
      Уведомления
    </NavLink>
  );
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
    isActive
      ? "bg-primary/10 font-medium text-primary"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );

export function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {groups.map((group, i) => (
        <NavGroup
          key={group.title}
          group={group}
          onNavigate={onNavigate}
          className={cn(i > 0 && "mt-2")}
        />
      ))}
    </>
  );
}

/** Группа-источник: заголовок со стрелкой, по клику разворачивается список
 *  разделов. Состояние запоминается, но группа текущей страницы открыта
 *  всегда — иначе после перехода меню выглядело бы пустым. */
function NavGroup({
  group,
  onNavigate,
  className,
}: {
  group: (typeof groups)[number];
  onNavigate?: () => void;
  className?: string;
}) {
  const { pathname } = useLocation();
  const key = `mosres-nav:${group.title}`;
  const hasActive = group.items.some(({ to, end }) =>
    end ? pathname === to : pathname.startsWith(to),
  );
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? group.defaultOpen : stored === "1";
  });
  useEffect(() => {
    localStorage.setItem(key, open ? "1" : "0");
  }, [key, open]);

  const expanded = open || hasActive;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ChevronRight
          size={13}
          className={cn("transition-transform", expanded && "rotate-90")}
        />
        {group.title}
      </button>
      {expanded &&
        group.items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={linkCls}>
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <Icon size={16} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
      <BellItem onNavigate={onNavigate} />
    </>
  );
}

function LastUpdated() {
  const { data } = useStatus();
  return (
    <div className="px-2.5 text-xs leading-tight text-muted-foreground">
      <div>Данные обновлены</div>
      <div className="tnum text-foreground">{relTime(data?.last_refresh)}</div>
      {data && (
        <div className="mt-0.5">каждые {data.interval_minutes} мин</div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[200px_1fr]">
      <aside className="sticky top-0 z-20 hidden h-screen flex-col border-r border-border bg-card px-3 py-4 md:flex">
        <div className="px-2.5 pb-4">
          <span className="tnum text-[15px] font-medium tracking-tight">
            mos<span className="text-primary">res</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          <NavGroups />
          <div className="mt-3">
            <BellItem />
          </div>
        </nav>
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <LastUpdated />
          <button
            type="button"
            onClick={clearSession}
            className="px-2.5 text-left text-xs text-muted-foreground hover:text-foreground"
          >
            {getUsername() ?? "вход"} · выйти
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-border bg-card px-3 py-2 md:hidden">
        <span className="tnum mr-2 text-sm font-medium">
          mos<span className="text-primary">res</span>
        </span>
        <NavItems />
      </header>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
