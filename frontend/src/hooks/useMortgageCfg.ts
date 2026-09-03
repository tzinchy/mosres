import { useCallback, useSyncExternalStore } from "react";
import {
  MORTGAGE_KEY,
  loadMortgageCfg,
  type MortgageCfg,
} from "@/lib/mortgage";

// One shared source of truth for the mortgage config. MortgagePage, the sheet
// widget and the aparts table all read/write the same localStorage key; without
// this they'd drift until a full reload.
const EVT = "mosres-mortgage-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

let raw: string | null = null;
let snap: MortgageCfg = loadMortgageCfg();
function getSnapshot(): MortgageCfg {
  const cur = localStorage.getItem(MORTGAGE_KEY) ?? "{}";
  if (cur !== raw) {
    raw = cur;
    snap = loadMortgageCfg();
  }
  return snap;
}

export function useMortgageCfg(): [
  MortgageCfg,
  (patch: Partial<MortgageCfg>) => void,
] {
  const cfg = useSyncExternalStore(subscribe, getSnapshot);
  const set = useCallback((patch: Partial<MortgageCfg>) => {
    const next = { ...loadMortgageCfg(), ...patch };
    localStorage.setItem(MORTGAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVT));
  }, []);
  return [cfg, set];
}
