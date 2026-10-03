import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { getProfile } from "./db";

/**
 * Client-side gate: redirects to /auth when nobody is signed in.
 * With `redirectIfOnboarded`, users who already finished onboarding go to /dashboard.
 */
export function useRequireAuth(opts: { redirectIfOnboarded?: boolean } = {}) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const { redirectIfOnboarded } = opts;
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { navigate({ to: "/configuration", replace: true }); return; }
    let alive = true;
    sb.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      if (!data.user) return navigate({ to: "/auth", replace: true });
      if (redirectIfOnboarded) {
        const p = await getProfile().catch(() => null);
        if (alive && p?.onboarding_completed) return navigate({ to: "/dashboard", replace: true });
      }
      if (alive) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((e) => { if (e === "SIGNED_OUT") navigate({ to: "/auth", replace: true }); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [navigate, redirectIfOnboarded]);
  return ready;
}


}
