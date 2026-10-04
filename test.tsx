import { createFileRoute, redirect } from "@tanstack/react-router";

// Le test de l'agent est maintenant intégré au Studio (/configuration).
export const Route = createFileRoute("/test")({
  beforeLoad: () => {
    throw redirect({ to: "/configuration" });
  },
});
