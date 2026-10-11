import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

export type Entry = {
  id: string;
  createdAt: number;
  audioUri: string;          // local file; '' if the entry came from another device
  audioPath?: string;        // path in the Supabase bucket
  title: string;
  transcript: string;
  summary: string;
  status: 'pending' | 'done';
  lastError?: string;        // reason the last processEntry attempt failed
  durationMs?: number;       // length of the recording; missing on entries made before this feature
};
const OWNER = 'entries_owner';

// Path is derived from the id, never stored: iOS can change the app's container path after an update
export const localAudio = (id: string) => new File(Paths.document, `${id}.m4a`);

export async function loadEntries(): Promise<Entry[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(OWNER)) ?? '[]');
  } catch {
    return []; // corrupt JSON shouldn't brick the app
  }
}

// Delete the local feed and the recordings on disk, so the next user never sees them
export async function wipeLocal() {  
  await update((all) => {
    for (const e of all) {
      try { const f = localAudio(e.id); if (f.exists) f.delete(); } catch {}
      try { if (e.audioUri) { const f = new File(e.audioUri); if (f.exists) f.delete(); } } catch {} // older entries
    }
    return [];
  });
  await AsyncStorage.removeItem(OWNER);
}

// Entries on disk belong to whoever was signed in; wipe them if the account changed
export async function claimLocalCache(uid: string) {
  if ((await AsyncStorage.getItem(OWNER)) === uid) return;
  await wipeLocal();
  await AsyncStorage.setItem(OWNER, uid);
}

const listeners = new Set<() => void>();
export const onChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

// Serialise read-modify-write so concurrent saves can't drop entries
let queue: Promise<unknown> = Promise.resolve();
function update(fn: (all: Entry[]) => Entry[]) {
  const run = queue.then(async () => {
    const next = fn(await loadEntries()).sort((a, b) => b.createdAt - a.createdAt);
    await AsyncStorage.setItem(OWNER, JSON.stringify(next));
    listeners.forEach((f) => f());
  });
  queue = run.catch(() => {}); // keep the queue alive; the caller still sees the error
  return run;
}

export const upsertEntry = (e: Entry) => update((all) => [e, ...all.filter((x) => x.id !== e.id)]);

export const mergeRemote = (rows: Entry[]) =>
  update((all) => {
    const byId = new Map(all.map((e) => [e.id, e]));
    for (const r of rows) {
      const existing = byId.get(r.id);
      byId.set(r.id, { ...existing, ...r, audioUri: existing?.audioUri || r.audioUri || '' });
    }
    return [...byId.values()];
  });