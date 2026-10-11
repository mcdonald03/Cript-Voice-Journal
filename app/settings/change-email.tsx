import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { Page } from '../../src/components/Page';
import { Button, Field, Message } from '../../src/components/ui';
import { redirectUrl } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/lib/theme';

export default function ChangeEmail() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    const addr = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(addr)) return setError('Enter a valid email address.');
    if (addr.toLowerCase() === user?.email?.toLowerCase()) return setError('That’s already your email.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: addr }, { emailRedirectTo: redirectUrl() });
      if (error) return setError(error.message);
      setInfo(`We sent a confirmation link to ${addr}. Your email changes after you confirm it. You may also need to confirm from your current address.`);
      setEmail('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Change Email">
      {!!user?.email && <Text style={[theme.type.body, { color: theme.dim }]}>Current email: {user.email}</Text>}
      <Field
        placeholder="New email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Message text={error} />
      <Message tone="info" text={info} />
      <Button label="Send confirmation" onPress={submit} loading={busy} />
    </Page>
  );
}
