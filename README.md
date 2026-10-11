# Cript

A private voice journal built with Expo and React Native. Talk for a minute, and Cript transcribes it, then turns the biggest moment into a title and a short reflection you can look back on.

Built with **Expo SDK 57**, **Expo Router**, **expo-audio**, the new **expo-file-system** API, **Supabase** (auth + Postgres + Storage + Edge Functions), and AsyncStorage. Pure-black, minimalist design.

---

## Features

- **Voice entries** — record, save, and review. Audio is stored on-device in the documents directory and backed up to Supabase Storage.
- **Automatic transcription & summaries** — audio is sent to a Supabase Edge Function that transcribes with Groq Whisper and asks a Groq chat model for a JSON `{ title, summary }`.
- **Offline-first feed** — entries are stored locally and sync when you're back online. Failed processing is retryable.
- **Entry detail** — playback with a tap-to-seek progress bar, plus the title, summary, and full transcript.
- **Insights** — total minutes recorded, entry count, current streak, and a month-by-month activity dot grid.
- **Settings** — change password, change email, delete account, and grouped legal/account rows.

## Screens

| Route | Screen |
|-------|--------|
| `app/index.tsx` | Home feed (cards grouped by day) |
| `app/record.tsx` | Recording screen |
| `app/entry/[id].tsx` | Entry detail + audio player |
| `app/analytics.tsx` | Insights (minutes + calendar) |
| `app/profile.tsx` | Profile → grouped settings |
| `app/settings/*` | Notifications, Appearance, About, Change Password, Change Email, Delete Account |
| `app/(auth)/*` | Onboarding, Sign up, Log in, Email verification |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

The app talks to a Supabase project. The URL and publishable (anon) key live in `src/lib/supabase.ts`. Create your own project at [supabase.com](https://supabase.com), then update those two constants.

Create the `entries` table (Row Level Security **must** be enabled so the public key can only touch the signed-in user's rows):

```sql
create table public.entries (
  id uuid primary key,
  created_at timestamptz not null default now(),
  title text,
  transcript text,
  summary text,
  audio_url text,
  duration_ms integer,
  user_id uuid not null references auth.users(id)
);

alter table public.entries enable row level security;

create policy "own entries" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Also create a **private** Storage bucket named `audio`.

### 3. Set Edge Function secrets

```bash
npx supabase link            # link your project
npx supabase secrets set GROQ_API_KEY=gsk_...     # from console.groq.com
# optional model override (defaults to openai/gpt-oss-20b):
npx supabase secrets set GROQ_LLM=openai/gpt-oss-20b
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the platform — **never** set or commit them yourself. The service-role key is used **only** inside the `delete-account` function.

### 4. Run it

```bash
npx expo start
```

Then press `a` (Android), `i` (iOS), or scan the QR code in Expo Go.

> Run `npx expo start -c` to clear the Metro cache after changing routes.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` | Start on a device/emulator |
| `npm run web` | Start for web |
| `npm run lint` | Lint the project |
| `npx tsc --noEmit` | Type-check |

## Edge Functions

Deployed from `supabase/functions/`:

```bash
npx supabase functions deploy process-entry
npx supabase functions deploy delete-account
```

- **`process-entry`** — receives raw audio bytes, transcribes with Groq Whisper (`whisper-large-v3-turbo`), generates a `{ title, summary }` with a Groq chat model, backs up the audio, and upserts the row. Always responds with JSON.
- **`delete-account`** — verifies the caller, then (with the service-role key) deletes their audio files, their rows, and their auth user.

## Secrets & security

- Never commit `.env*` files or the Supabase service-role / secret key. Both are git-ignored.
- The publishable (anon) key in `src/lib/supabase.ts` is safe to expose — that is what it is designed for. Your data is protected by Row Level Security, not by hiding this key.
- Groq retires models over time; if the chat call 404s, check [Groq's deprecations](https://console.groq.com/docs/deprecations) and update the default in `supabase/functions/process-entry/index.ts`.

---

## Project structure

```
app/                 # Expo Router screens (each file is a route)
  (auth)/            # sign-in / onboarding stack
  entry/[id].tsx     # entry detail + player
  settings/          # settings sub-pages
src/
  components/        # UI (Button, Field, Page, Settings rows, PillNav…)
  lib/               # storage, pipeline, auth, supabase, theme…
supabase/
  functions/         # Deno edge functions
```
