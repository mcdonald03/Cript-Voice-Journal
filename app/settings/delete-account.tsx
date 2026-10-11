import { useState } from 'react';
import { Text } from 'react-native';
import { Page } from '../../src/components/Page';
import { Button, Field, Message } from '../../src/components/ui';
import { signOutAndClear } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/lib/theme';

// supabase.functions.invoke hides the server's JSON error behind a generic message: dig it out
async function readError(err: unknown): Promise<string> {
  const ctx = (err as { context?: Response }).context;
  if (ctx && typeof ctx.text === 'function') {
    try {
      const body = JSON.parse(await ctx.text());
      if (body?.error) return String(body.error);
    } catch {}
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

export default function DeleteAccount() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = text.trim().toUpperCase() === 'DELETE';

  const remove = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw new Error(await readError(error));
      // The account no longer exists: drop the session and wipe this device
      const err = await signOutAndClear();
      if (err) setError(`Your account was deleted, but this device couldn’t sign out (${err}). Close and reopen the app.`);
      // success: the root layout swaps to the auth stack
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Delete My Account">
      <Text style={[theme.type.body, { color: theme.dim }]}>
        This permanently deletes your account and everything in it:{'\n\n'}
        • every entry: title, summary and transcript{'\n'}
        • every audio recording, in the cloud and on this device{'\n'}
        • your sign-in{'\n\n'}
        This can’t be undone.
      </Text>
      <Field
        placeholder="Type DELETE to confirm"
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={remove}
      />
      <Message text={error} />
      <Button variant="outline" label="Delete everything" onPress={remove} loading={busy} disabled={!ready} />
    </Page>
  );
}
