import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Message } from './ui';
import { signInWithProvider } from '../lib/auth';
import { theme } from '../lib/theme';

type Props = { beforePress?: () => boolean }; // return false to block (e.g. terms unchecked)

export function SocialButtons({ beforePress }: Props) {
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (p: 'apple' | 'google') => {
    if (busy || (beforePress && !beforePress())) return;
    setBusy(p);
    setError(null);
    try {
      setError(await signInWithProvider(p));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.line }} />
        <Text style={[theme.type.caption, { color: theme.dim }]}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.line }} />
      </View>
      <Button variant="outline" icon="logo-apple" label="Continue with Apple" loading={busy === 'apple'} disabled={!!busy} onPress={() => go('apple')} />
      <Button variant="outline" icon="logo-google" label="Continue with Google" loading={busy === 'google'} disabled={!!busy} onPress={() => go('google')} />
      <Message text={error} />
    </View>
  );
}