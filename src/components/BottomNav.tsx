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
    <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur z-50">
      <div className="max-w-3xl mx-auto flex justify-around py-2">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
                active ? "text-green-500" : "text-neutral-500 hover:text-white"
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
