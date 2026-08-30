import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PUBLIC_PATHS = ["/auth"];

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Sign in to MastiGuard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Herd data, alerts and recommendations are private to your farm, cooperative or district.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          Sign in or create an account
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
