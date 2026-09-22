import { useState } from "react";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await login(username.trim(), password);
      saveSession(res.token, res.username);
    } catch {
      setError("Неверный логин или пароль");
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
          <p className="text-sm text-muted-foreground">Вход</p>
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
            autoComplete="current-password"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </label>

        {error && <p className="text-sm text-neg">{error}</p>}

        <Button type="submit" disabled={busy || !username || !password} className="w-full">
          {busy ? "Проверяем…" : "Войти"}
        </Button>
      </form>
    </div>
  );
}
