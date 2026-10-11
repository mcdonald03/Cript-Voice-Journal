import { useRef, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuthShell, Button, Field, Message, PasswordField } from '../../src/components/ui';
import { SocialButtons } from '../../src/components/SocialButtons';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/lib/theme';

export default function Login() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return setError(
        /not confirmed/i.test(error.message)
          ? 'Your email isn’t confirmed yet. Tap the link we emailed you, then try again.'
          : error.message,
      );
    }
    // success: the root layout swaps to the feed
  };

  return (
    <AuthShell title="Welcome back">
      <Field
        ref={emailRef}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Message text={error} />
      <Button label="Log in" onPress={submit} loading={busy} />

      <SocialButtons />

      <Pressable hitSlop={12} onPress={() => router.replace('/(auth)/signup')} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={[theme.type.body, { color: theme.dim }]}>
          Don't have an account? <Text style={{ color: theme.fg, fontWeight: '600' }}>Sign up</Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}