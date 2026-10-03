<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Data uses the user's external Supabase via `src/lib/supabase.ts` (VITE_SUPABASE_URL/ANON_KEY), not Lovable Cloud — user requirement.
- All Railway backend calls go through `src/lib/api.ts` (VITE_BACKEND_URL) — single place to adjust endpoints.
- User data (profiles, agents, subscriptions) is read/written via `src/lib/db.ts` with Supabase anonymous auth + RLS by auth.uid(); schema in `supabase/schema.sql`. Only the backend (service role) may set a subscription beyond `pending`.
