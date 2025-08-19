# Notes App - Online Sync Setup Guide

## Overview

Your notes app now has complete offline-first synchronization with Supabase! Here's what's been implemented:

## Features Added

### 🔄 **Bidirectional Sync**
- **Offline-first**: All notes are stored locally in IndexedDB using Dexie
- **Automatic sync**: When online and authenticated, changes sync automatically
- **Conflict resolution**: Remote changes take precedence based on `updated_at` timestamp
- **Outbox pattern**: Offline changes are queued and synced when connection is restored

### 🔐 **Authentication**
- **Sign up/Sign in**: Email and password authentication via Supabase Auth
- **Persistent sessions**: User remains signed in across browser sessions
- **Secure sync**: Only syncs data when user is authenticated

### 📱 **UI Improvements**
- **Sync status**: Shows spinning indicator when syncing
- **Offline indicator**: Visual indicator when device is offline
- **Unsynced notes**: Orange dot on notes that haven't been synced yet
- **Status field**: Notes can be categorized as "To Do", "Doing", or "Done"

## Setup Instructions

### 1. Supabase Configuration

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Create the notes table** in your Supabase SQL editor:

```sql
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  status text not null default 'todo',
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notes enable row level security;

-- Create policies
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

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key from your project settings

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. How It Works

#### **Local Storage (IndexedDB)**
- Notes are stored locally using Dexie (IndexedDB wrapper)
- Includes an `outbox` table that queues operations when offline
- Each note has a `synced` flag to track sync status

#### **Sync Process**
1. **Pull**: Fetches remote changes and merges with local data
2. **Push**: Sends local changes from the outbox to Supabase
3. **Automatic**: Runs every 30 seconds when online and authenticated
4. **Manual**: Triggered immediately after local operations

#### **Offline Support**
- All CRUD operations work offline
- Changes are queued in the outbox table
- When connection is restored, queued operations sync automatically
- Failed operations retry up to 5 times before being discarded

#### **Authentication Flow**
- Users can use the app offline without authentication
- Sign in to enable cloud sync
- On sign in, performs initial sync to pull user's existing notes
- Sign out stops syncing but preserves local data

### 3. Usage

1. **Install dependencies**: `npm install`
2. **Start development**: `npm run dev`
3. **Create account**: Click "Sign In" → "Sign Up" 
4. **Test offline**: 
   - Disconnect internet
   - Create/edit notes (they'll show orange dots)
   - Reconnect internet
   - Watch notes sync automatically

### 4. Key Files

- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/syncService.ts` - Complete sync logic
- `src/lib/db.ts` - IndexedDB schema with outbox
- `src/hooks/useAuth.ts` - Authentication management
- `src/hooks/useNotes.ts` - Notes CRUD with sync integration
- `src/components/AuthModal.tsx` - Sign in/up UI

## Deployment

The app is ready for deployment to Vercel, Netlify, or any static hosting:

1. Set environment variables in your hosting platform
2. Build: `npm run build`
3. Deploy the `dist` folder

Your notes will now sync seamlessly across all devices! 🎉
