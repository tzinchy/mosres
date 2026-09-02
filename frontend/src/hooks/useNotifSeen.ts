import { useCallback, useSyncExternalStore } from "react";

const KEY = "mosres-notif-seen";

function get(): string {
  return localStorage.getItem(KEY) ?? "1970-01-01T00:00:00Z";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useNotifSeen() {
  const lastSeen = useSyncExternalStore(subscribe, get, get);
  const markSeen = useCallback(() => {
    localStorage.setItem(KEY, new Date().toISOString());
    listeners.forEach((l) => l());
  }, []);
  return { lastSeen, markSeen };
}
