import {
  Bell,
  Building2,
  Calculator,
  LayoutDashboard,
  Map as MapIcon,
  Table2,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useNotifications, useStatus } from "@/hooks/useDashboard";
import { useNotifSeen } from "@/hooks/useNotifSeen";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Сводка", icon: LayoutDashboard, end: true },
  { to: "/aparts", label: "Квартиры", icon: Table2, end: false },
  { to: "/buildings", label: "Дома", icon: Building2, end: true },
  { to: "/map", label: "Карта", icon: MapIcon, end: false },
  { to: "/mortgage", label: "Ипотека", icon: Calculator, end: false },
];

function BellItem({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useNotifications();
  const { lastSeen } = useNotifSeen();
  const unread = (data ?? []).filter((n) => n.updated_at > lastSeen).length;
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
          <NavItems />
        </nav>
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <LastUpdated />
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
