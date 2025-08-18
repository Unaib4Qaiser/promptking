
# Notes Kanban — PWA + Supabase + Offline-first

Mobile-first, fast, and responsive notes app with:
- Supabase auth + storage for notes
- Offline-first via IndexedDB (Dexie) + outbox sync
- PWA (installable) using `vite-plugin-pwa`
- Kanban layout (Todo / Doing / Done)
- 2 cards per row on mobile
- Copy + Edit (with Delete inside editor)
- Search by title
- Ready for Vercel deploy

## Supabase setup

Create a `notes` table and RLS policies:

```sql
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  status text not null default 'todo',
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.notes enable row level security;

create policy "notes are viewable by owner"
  on public.notes for select
  using ( auth.uid() = user_id );

create policy "notes are insertable by owner"
  on public.notes for insert
  with check ( auth.uid() = user_id );

create policy "notes are updatable by owner"
  on public.notes for update
  using ( auth.uid() = user_id );

create policy "notes are deletable by owner"
  on public.notes for delete
  using ( auth.uid() = user_id );
```

Add `.env` with your keys:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Local dev

```bash
npm i
npm run dev
```

## Vercel deploy

1. Push this repo to GitHub.
2. Import to Vercel as a Vite project.
3. Add the two env vars in **Project Settings → Environment Variables**.
4. Redeploy. After first load, it works offline too (static assets cached).

## Notes on Offline Sync
- The app stores notes locally in IndexedDB.
- Any changes are queued in an **outbox**. When you go online and are signed in, the queue syncs to Supabase.
- On load it also **pulls** from Supabase and merges by latest `updated_at`.
