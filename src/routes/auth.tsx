import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/lord/AppShell";
import { HudPanel } from "@/components/lord/HudPanel";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "LORD — Sign In" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    authClient.getSession().then((session) => {
      if (mounted && session?.user) navigate({ to: "/chat" });
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (result.error) throw new Error(result.error.message);
        setInfo("Account created successfully! Sign in to continue.");
        setMode("signin");
        setEmail("");
        setPassword("");
        setName("");
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) throw new Error(result.error.message);
        navigate({ to: "/chat" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, { h: string; sub: string; btn: string }> = {
    signin: { h: "Access LORD", sub: "Sign in to continue.", btn: "Sign In" },
    signup: { h: "Create Identity", sub: "Register a new operator.", btn: "Create Account" },
  };
  const t = titles[mode];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-1">
        <h1 className="mb-1 font-display text-2xl tracking-wide gradient-text text-glow sm:text-3xl">
          {t.h}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{t.sub}</p>

        <HudPanel title={t.btn}>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field icon={UserIcon} label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent text-base outline-none sm:text-sm"
                />
              </Field>
            )}
            <Field icon={Mail} label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-transparent text-base outline-none sm:text-sm"
              />
            </Field>
            <Field icon={Lock} label="Password">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-base outline-none sm:text-sm"
              />
            </Field>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_18px_var(--hud)] transition hover:scale-[1.01] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.btn}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  Create account →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  ← Back to sign in
                </button>
              )}
            </div>
          </form>
        </HudPanel>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
            ← Back to home
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 focus-within:border-primary">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}
