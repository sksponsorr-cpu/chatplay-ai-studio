import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

/** Client-side gate: redirects to /auth when no Supabase user is signed in. */
export function useRequireAuth() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setReady(true); return; }
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth", replace: true });
      else setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((e) => { if (e === "SIGNED_OUT") navigate({ to: "/auth", replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);
  return ready;
}
