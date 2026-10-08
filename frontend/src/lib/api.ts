import { clearSession, getToken } from "@/lib/auth";

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

async function errorText(res: Response): Promise<string> {
  const fallback = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    const d = body?.detail;
    if (typeof d === "string" && d) return d;
    if (Array.isArray(d) && d.length) {
      const msgs = d
        .map((e) => (e as { msg?: string })?.msg)
        .filter(Boolean)
        .join("; ");
      if (msgs) return msgs;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  // Токен протух или отозван — выкидываем на экран входа, а не показываем
  // пустые таблицы.
  if (res.status === 401) {
    clearSession();
    throw new Error("401 Unauthorized");
  }
  // Текст ошибки нужен на экране (кривая маска номера — 422 с объяснением),
  // поэтому вытаскиваем `detail` из тела, а не показываем сухой статус.
  if (!res.ok) throw new Error(await errorText(res));
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const login = (username: string, password: string) =>
  req<{ token: string; username: string }>("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

export const register = (username: string, password: string) =>
  req<{ token: string; username: string }>("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

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
