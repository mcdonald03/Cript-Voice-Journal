import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  let step = 'start';
  try {
    step = 'auth';
    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Not signed in', step }, 401);

    // Service role stays inside this function; it is never sent to the app
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    step = 'storage';
    for (let i = 0; i < 50; i++) { // paged delete; the cap prevents an endless loop
      const { data, error } = await admin.storage.from('audio').list(user.id, { limit: 100 });
      if (error) throw new Error(`Storage: ${error.message}`);
      if (!data?.length) break;
      const { error: rmError } = await admin.storage.from('audio').remove(data.map((f) => `${user.id}/${f.name}`));
      if (rmError) throw new Error(`Storage: ${rmError.message}`);
    }

    step = 'database';
    const { error: dbError } = await admin.from('entries').delete().eq('user_id', user.id);
    if (dbError) throw new Error(`Database: ${dbError.message}`);

    step = 'user';
    const { error: delError } = await admin.auth.admin.deleteUser(user.id);
    if (delError) throw new Error(`Auth: ${delError.message}`);

    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    console.error(`delete-account failed at step "${step}":`, message);
    return json({ error: message, step }, 500);
  }
});
