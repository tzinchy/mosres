export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const BASE = API_BASE;

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const apiGet = <T>(path: string, params?: Record<string, unknown>) =>
  req<T>(`${path}${qs(params)}`);
export const apiPost = <T>(path: string, body?: unknown) =>
  req<T>(path, {
    method: "POST",
    ...(body !== undefined
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
export const apiDelete = <T>(path: string) => req<T>(path, { method: "DELETE" });
