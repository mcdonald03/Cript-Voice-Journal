import { createClient } from 'npm:@supabase/supabase-js@2';

const GROQ = 'https://api.groq.com/openai/v1';
const KEY = Deno.env.get('GROQ_API_KEY');
const LLM = Deno.env.get('GROQ_LLM') ?? 'openai/gpt-oss-20b'; // Groq retires models often: check console.groq.com/docs/deprecations
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM =
  'You write for a private voice journal. Find the single biggest moment or theme in the transcript. ' +
  'Reply with ONLY a JSON object: {"title": string, max 6 words, no trailing punctuation, "summary": string, 1-2 warm sentences, no advice}.';

// Every response, success or failure, is JSON
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const groq = (path: string, init: RequestInit) =>
  fetch(GROQ + path, { method: 'POST', ...init, headers: { Authorization: `Bearer ${KEY}`, ...init.headers } });

// Read as text first so a non-JSON upstream body becomes a readable error, not "Unexpected token"
async function readJson(res: Response, label: string) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// Models sometimes wrap the JSON in ```fences``` or add chatter around it
function parseModelJson(content: string): { title: string; summary: string } {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in model reply');
  const obj = JSON.parse(content.slice(start, end + 1));
  const title = String(obj.title ?? '').trim();
  if (!title) throw new Error('model reply has no title');
  return { title, summary: String(obj.summary ?? '').trim() };
}

const fallbackTitle = (transcript: string) =>
  transcript.split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '') || 'Untitled';

Deno.serve(async (req) => {
  let step = 'start';
  try {
    if (!KEY) {
      return json({ error: 'GROQ_API_KEY is not set. Run: npx supabase secrets set GROQ_API_KEY=...', step }, 500);
    }

    step = 'auth';
    // The caller's JWT is forwarded, so database and storage RLS apply
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'Not signed in', step }, 401);

    step = 'request';
    const id = req.headers.get('x-entry-id') ?? '';
    if (!UUID.test(id)) return json({ error: 'Missing or invalid x-entry-id header', step }, 400);
    const audio = await req.blob(); // the raw m4a bytes
    if (audio.size === 0) return json({ error: 'Empty audio body', step }, 400);

    step = 'transcribe';
    const g = new FormData();
    g.append('file', audio, 'entry.m4a');
    g.append('model', 'whisper-large-v3-turbo');
    const transcript = String((await readJson(await groq('/audio/transcriptions', { body: g }), 'Groq transcription')).text ?? '').trim();

    step = 'summarise';
    let title = 'Untitled';
    let summary = '';
    if (transcript) { // silence: skip the LLM
      const data = await readJson(
        await groq('/chat/completions', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: LLM,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: transcript }],
          }),
        }),
        'Groq chat', // HTTP errors (401, 429, retired model) propagate so the user can retry
      );
      try {
        ({ title, summary } = parseModelJson(String(data.choices?.[0]?.message?.content ?? '')));
      } catch (e) {
        // Formatting problem only: keep the transcript instead of failing the entry
        console.error('summarise parse failed, using fallback title:', e instanceof Error ? e.message : e);
        title = fallbackTitle(transcript);
        summary = '';
      }
    }

    step = 'storage';
    // Audio backup: best effort, the text matters more
    const path = `${user.id}/${id}.m4a`;
    const up = await sb.storage.from('audio').upload(path, audio, { contentType: 'audio/mp4', upsert: true });
    const audioPath = up.error ? null : path;
    if (up.error) console.error('audio backup failed:', up.error.message);

    step = 'database';
    const { error } = await sb.from('entries').upsert({
      id,
      created_at: req.headers.get('x-created-at') ?? new Date().toISOString(),
      title,
      transcript,
      summary,
      audio_url: audioPath,
      duration_ms: Number(req.headers.get('x-duration-ms')) || null,
    });
    if (error) throw new Error(`Database: ${error.message}`);

    return json({ transcript, title, summary, audioPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    console.error(`process-entry failed at step "${step}":`, message); // never log transcripts
    return json({ error: message, step }, 500);
  }
});
