import { Link, useLocation } from "@tanstack/react-router";
import { Home, Settings, MessageSquare, FlaskConical, User } from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/configuration", label: "Config", icon: Settings },
  { to: "/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/test", label: "Tester", icon: FlaskConical },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl justify-around py-2">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
