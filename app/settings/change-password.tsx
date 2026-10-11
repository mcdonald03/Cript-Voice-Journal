import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { User } from '@supabase/supabase-js';
import { Page } from '../../src/components/Page';
import { Button, Message, PasswordField } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

export default function ChangePassword() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  // Apple/Google accounts have no password to change
  const hasPassword = !!user?.app_metadata?.providers?.includes('email');

  const submit = async () => {
    if (busy || !user?.email) return;
    setError(null);
    setDone(false);
    if (!current) return setError('Enter your current password.');
    if (next.length < 8) return setError('Use at least 8 characters for the new password.');
    if (next !== confirm) return setError('The new passwords don’t match.');
    setBusy(true);
    try {
      // Re-check identity first, so someone holding an unlocked phone can't take over the account
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (check.error) return setError(check.error.status === 400 ? 'Your current password is incorrect.' : check.error.message);
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) return setError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrent(''); setNext(''); setConfirm('');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Change Password">
      {user === undefined ? null : !hasPassword ? (
        <Message tone="info" text="You signed in with Apple or Google, so there’s no password to change here." />
      ) : (
        <>
          <PasswordField placeholder="Current password" value={current} onChangeText={setCurrent} autoComplete="current-password" textContentType="password" />
          <PasswordField placeholder="New password" value={next} onChangeText={setNext} autoComplete="new-password" textContentType="newPassword" />
          <PasswordField placeholder="Confirm new password" value={confirm} onChangeText={setConfirm} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
          <Message text={error} />
          <Message tone="info" text={done ? 'Password updated.' : null} />
          <Button label="Update password" onPress={submit} loading={busy} />
        </>
      )}
    </Page>
  );
}
