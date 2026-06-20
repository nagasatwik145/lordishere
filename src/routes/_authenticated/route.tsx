import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { authClient } from "@/lib/auth-client";

const getSession = createServerFn().handler(async () => {
  // Server function to validate session
  try {
    const session = await authClient.getSession();
    return session;
  } catch (err) {
    return null;
  }
});

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: session.user };
  },
  component: () => <Outlet />,
});
