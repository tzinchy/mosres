import { useState } from "react";
import { Button } from "@/components/ui/button";
import { login, register } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  // те же границы, что у RegisterIn на сервере — чтобы не ловить 422 после отправки
  const tooShort =
    isRegister && (username.trim().length < 3 || password.length < 6);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = isRegister
        ? await register(username.trim(), password)
        : await login(username.trim(), password);
      saveSession(res.token, res.username);
    } catch (err) {
      setError(
        isRegister
          ? // текст из detail: «Такой логин уже занят» и прочее
            (err as Error).message || "Не удалось зарегистрироваться"
          : "Неверный логин или пароль",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div>
          <h1 className="font-mono text-lg font-semibold">mosres</h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Регистрация" : "Вход"}
          </p>
        </div>

        <div className="flex rounded-lg border border-border p-0.5">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                mode === m
                  ? "bg-secondary font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "login" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>

        <label className="block space-y-1">
          <span className="text-sm">Логин</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </label>

        {isRegister && (
          <p className="text-xs text-muted-foreground">
            Логин — от 3 символов (буквы, цифры, <code>. - _</code>), пароль — от
            6 символов.
          </p>
        )}

        {error && <p className="text-sm text-neg">{error}</p>}

        <Button
          type="submit"
          disabled={busy || !username || !password || tooShort}
          className="w-full"
        >
          {busy
            ? isRegister
              ? "Создаём…"
              : "Проверяем…"
            : isRegister
              ? "Зарегистрироваться"
              : "Войти"}
        </Button>
      </form>
    </div>
  );
}
