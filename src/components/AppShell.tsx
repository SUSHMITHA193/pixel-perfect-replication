import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  Bell,
  Map,
  Upload,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useStore } from "@/lib/app-store";

const nav = [
  { to: "/", icon: LayoutDashboard, key: "dashboard" },
  { to: "/registry", icon: ListChecks, key: "animals" },
  { to: "/alerts", icon: Bell, key: "alerts" },
  { to: "/map", icon: Map, key: "map" },
  { to: "/data", icon: Upload, key: "data" },
  { to: "/analytics", icon: BarChart3, key: "analytics" },
  { to: "/settings", icon: Settings, key: "settings" },
] as const;

const langs: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "hi", label: "हिं" },
  { id: "ta", label: "தமி" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { role, alerts } = useStore();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold">{t("app_name")}</span>
              <span className="block text-[11px] text-muted-foreground">{t("tagline")}</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                activeProps={{ className: "bg-primary/10 text-primary" }}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border">
              {langs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={`px-2 py-1.5 text-xs font-semibold transition-colors ${
                    lang === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Link
              to="/auth"
              className="hidden rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground sm:block"
            >
              {role}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t bg-card md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <span className="relative">
              <n.icon className="size-5" />
              {n.key === "alerts" && alerts.length > 0 && (
                <span className="absolute -right-2 -top-1 rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {alerts.length}
                </span>
              )}
            </span>
            {t(n.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
