import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/lord/AppShell";
import { Loader2 } from "lucide-react";

interface CallbackSearchParams {
  code?: string;
  error?: string;
  error_description?: string;
}

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): CallbackSearchParams => ({
    code: typeof search.code === "string" ? search.code : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { code, error, error_description } = useSearch({ from: "/auth/callback" });
  const [message, setMessage] = useState<string>("Completing sign in...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (error) {
          setMessage(`Authentication failed: ${error_description || error}`);
          setTimeout(() => {
            navigate({ to: "/auth", replace: true });
          }, 2000);
          return;
        }

        if (!code) {
          setMessage("No authorization code received.");
          setTimeout(() => {
            navigate({ to: "/auth", replace: true });
          }, 2000);
          return;
        }

        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        if (data.user) {
          // Ensure profile exists for OAuth users
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              email: data.user.email,
              name:
                (data.user.user_metadata?.name as string) ||
                data.user.email?.split("@")[0] ||
                "User",
            });
            await supabase
              .from("user_settings")
              .insert({
                user_id: data.user.id,
              })
              .on("error", () => {});
            // Ignore if already exists
          } catch (e) {
            console.warn("[oauth-callback] Profile creation issue:", e);
          }
        }

        setMessage("Sign in successful! Redirecting...");
        navigate({ to: "/chat", replace: true });
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "OAuth callback failed";
        console.error("[oauth-callback] Error:", errMessage);
        setMessage(`Error: ${errMessage}`);
        setTimeout(() => {
          navigate({ to: "/auth", replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [code, error, error_description, navigate]);

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-120px)] w-full max-w-md flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </AppShell>
  );
}
