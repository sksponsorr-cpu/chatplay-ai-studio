import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";

/** Renders children only for signed-in users (optionally sending onboarded users to the dashboard). */
export function AuthGate({ children, redirectIfOnboarded }: { children: React.ReactNode; redirectIfOnboarded?: boolean }) {
  const ready = useRequireAuth({ redirectIfOnboarded });
  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return <>{children}</>;
}
