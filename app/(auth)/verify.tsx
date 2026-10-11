import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientGlow } from '../../src/components/AmbientGlow';
import { BORDER, Button, Message } from '../../src/components/ui';
import { pending, redirectUrl } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/lib/theme';

type Note = { text: string; tone: 'error' | 'info' } | null;

export default function Verify() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [email] = useState(pending.email);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  // Works once the email is confirmed anywhere: this phone, a desktop, another app
  const check = useCallback(async (silent: boolean) => {
    if (!pending.email) return router.replace('/login');
    if (!silent) setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: pending.email, password: pending.password });
    setBusy(false);
    if (!error) { pending.email = ''; pending.password = ''; return; } // root layout takes over
    if (/not confirmed/i.test(error.message)) {
      if (!silent) setNote({ text: 'Not confirmed yet. Tap the link in your email, then check again.', tone: 'info' });
    } else if (!silent) {
      setNote({ text: error.message, tone: 'error' });
    }
  }, [router]);

  // Coming back from the mail app: check quietly
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(true); });
    return () => sub.remove();
  }, [check]);

  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } });
    setNote(error ? { text: error.message, tone: 'error' } : { text: 'Sent again. Check your inbox.', tone: 'info' });
  };

  const changeEmail = () => {
    pending.email = '';
    pending.password = '';
    router.replace('/signup');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AmbientGlow y={0.4} intensity={0.6} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="mail-outline" size={30} color={theme.fg} />
        </View>
        <Text style={[theme.type.display, { color: theme.fg, textAlign: 'center' }]}>Check your email</Text>
        <Text style={[theme.type.body, { color: theme.dim, textAlign: 'center' }]}>
          We sent a confirmation link to{'\n'}
          <Text style={{ color: theme.fg }}>{email}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <ActivityIndicator size="small" color={theme.dim} />
          <Text style={[theme.type.caption, { color: theme.dim }]}>Waiting for confirmation…</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: bottom + 16, gap: 16 }}>
        <Message text={note?.text ?? null} tone={note?.tone} />
        <Button label="Check verification status" onPress={() => check(false)} loading={busy} />
        <Pressable accessibilityRole="button" hitSlop={12} onPress={resend} style={{ alignSelf: 'center' }}>
          <Text style={[theme.type.body, { color: theme.dim }]}>
            Didn't get it? <Text style={{ color: theme.fg, fontWeight: '600' }}>Resend email</Text>
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={changeEmail} style={{ alignSelf: 'center' }}>
          <Text style={[theme.type.body, { color: theme.dim }]}>Use a different email</Text>
        </Pressable>
      </View>
    </View>
  );
}