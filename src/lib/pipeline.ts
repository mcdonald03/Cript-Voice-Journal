import { ensureUser, supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';
import { Entry, loadEntries, localAudio, mergeRemote, upsertEntry } from './storage';
import { File } from 'expo-file-system';
import { fetchWithTimeout } from './net';

const inflight = new Set<string>();

const sameUser = async (uid: string) => (await supabase.auth.getSession()).data.session?.user.id === uid;

type AiResult = { transcript: string; title: string; summary: string; audioPath?: string };

// Read as text first: server and platform failures are often not JSON (HTML error pages, plain text, empty)
async function readAi(res: Response): Promise<AiResult> {
  const raw = await res.text();
  let body: any = null;
  try { body = JSON.parse(raw); } catch {}

  if (!res.ok) {
    console.warn('[process-entry]', res.status, raw.slice(0, 500)); // error bodies only
    if (body?.error) throw new Error(body.step ? `${body.error} (${body.step})` : String(body.error));
    const plain = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    throw new Error(`Server error ${res.status}${plain ? `: ${plain}` : ''}`);
  }
  if (!body || typeof body.title !== 'string') {
    // Don't log the body: a success body contains the user's transcript
    console.warn('[process-entry] unexpected response shape', body ? Object.keys(body) : 'unparseable');
    throw new Error('The server sent an unreadable response. Tap to retry.');
  }
  return body as AiResult;
}

// One request: the edge function transcribes, writes title + summary, backs up the audio and saves the row.
// On failure the entry stays pending with the reason in lastError.
export async function processEntry(e: Entry) {
  if (inflight.has(e.id)) return;
  inflight.add(e.id);
  let uid: string | undefined;
  try {
    let file = localAudio(e.id);
    if (!file.exists && e.audioUri) file = new File(e.audioUri); // entries from before this fix
    if (!file.exists) {
      // Nothing left to upload: stop retrying instead of looping on an error forever
      await upsertEntry({
        ...e,
        status: 'done',
        title: 'Recording lost',
        summary: 'The audio file is missing, so this entry couldn’t be transcribed.',
        lastError: undefined,
      });
      return;
    }

    uid = await ensureUser();
    if (e.lastError) await upsertEntry({ ...e, lastError: undefined }); // card flips back to "Processing…"

    const { data } = await supabase.auth.getSession();
    const bytes = await file.bytes(); // raw m4a bytes, no FormData
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/process-entry`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session!.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'audio/mp4',
          'x-entry-id': e.id,
          'x-created-at': new Date(e.createdAt).toISOString(),
          'x-duration-ms': String(Math.round(e.durationMs ?? 0)),
        },
        body: bytes,
      },
      90000,
    );
    const ai = await readAi(res);

    if (!(await sameUser(uid))) return; // signed out or switched account mid-flight
    await upsertEntry({ ...e, ...ai, status: 'done', lastError: undefined });
  } catch (err) {
    if (!uid || !(await sameUser(uid))) return;
    const message =
      err instanceof Error
        ? err.name === 'AbortError' ? 'Timed out. Check your connection.' : err.message
        : String(err);
    try { await upsertEntry({ ...e, lastError: message }); } catch {}
  } finally {
    inflight.delete(e.id);
  }
}


// Upload anything still pending (also used before logout)
export async function flushPending() {
  for (const e of (await loadEntries()).filter((x) => x.status === 'pending' && x.audioUri)) {
    await processEntry(e); // sequential: free-tier rate limits
  }
}
// Retry pending entries, then pull cloud entries (other devices, reinstall)
export async function sync() {
  await flushPending();
  try {
    const uid = await ensureUser();
    const { data, error } = await supabase.from('entries').select('*');
    // Signed out while fetching: don't repopulate the cache we just wiped
    if (error || !data || !(await sameUser(uid))) return;
    await mergeRemote(
      data.map((r) => ({
        id: r.id,
        createdAt: Date.parse(r.created_at),
        title: r.title,
        transcript: r.transcript,
        summary: r.summary,
        audioPath: r.audio_url ?? undefined,
        ...(r.duration_ms != null ? { durationMs: r.duration_ms as number } : {}),
        status: 'done' as const,
        lastError: undefined,
        audioUri: '',
      })),
    );
  } catch {
    // offline: the local feed still works
  }
}