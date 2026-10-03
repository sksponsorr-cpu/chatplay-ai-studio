import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary shadow-[var(--shadow-neon)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </span>
      <span className="font-display text-xl font-bold">
        chat<span className="neon-text">play</span>
      </span>
    </Link>
  );
}
