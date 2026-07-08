import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Users, Award, ListChecks, History, Factory } from "lucide-react";
import { useEffect, useState } from "react";
import { CHANGED_BY_KEY, DEFAULT_CHANGED_BY, getChangedBy } from "@/lib/db";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/manage", label: "Manage Competences", icon: ListChecks },
  { to: "/operators", label: "Operators", icon: Users },
  { to: "/competences", label: "Competences", icon: Award },
  { to: "/log", label: "Training Log", icon: History },
];

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState("");

  useEffect(() => {
    setUser(getChangedBy());
  }, []);

  function updateUser(v: string) {
    setUser(v);
    localStorage.setItem(CHANGED_BY_KEY, v || DEFAULT_CHANGED_BY);
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-base leading-tight">KUBAL</div>
            <div className="text-xs text-muted-foreground">Kompetensmatris</div>
          </div>
        </div>
        <nav className="p-3 flex flex-col gap-1 flex-1">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Signed in as
          </label>
          <Input
            value={user}
            onChange={(e) => updateUser(e.target.value)}
            placeholder="Your name"
            className="h-8 text-sm"
          />
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
