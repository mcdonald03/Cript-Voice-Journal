import { useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthShell, Button, Field, Message } from '../../src/components/ui';
import { SocialButtons } from '../../src/components/SocialButtons';
import { PRIVACY_URL, TERMS_URL } from '../../src/lib/legal';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/lib/theme';

export default function Signup() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Gates both the email button and the Apple/Google buttons
  const requireTerms = () => {
    if (agreed) return true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setError('Please agree to the Terms and Privacy to continue.');
    return false;
  };

  const submit = async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    if (!requireTerms()) return;
    if (!name.trim() || !email.trim() || !password) return setError('Fill in your name, email and password.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setBusy(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(error.message);
    } else if (!data.session) {
      setInfo('Check your email to confirm your account, then log in.'); // email confirmation is on
    }
    // with a session, the root layout swaps to the feed
  };

  return (
    <AuthShell title="Create your Cript account">
      <Field
        placeholder="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
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
      <Field
        ref={passwordRef}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Message text={error} />
      <Message text={info} tone="info" />
      <Button label="Sign up" onPress={submit} loading={busy} />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        hitSlop={8}
        onPress={() => { Haptics.selectionAsync(); setAgreed(!agreed); setError(null); }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={20} color={agreed ? theme.fg : theme.dim} />
        <Text style={{ color: theme.dim, fontSize: 13 }}>
          I agree to the{' '}
          <Text style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
          {' '}and{' '}
          <Text style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy</Text>.
        </Text>
      </Pressable>

      <SocialButtons beforePress={requireTerms} />

      <Pressable hitSlop={12} onPress={() => router.replace('/(auth)/login')} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={[theme.type.body, { color: theme.dim }]}>
          Already have an account? <Text style={{ color: theme.fg, fontWeight: '600' }}>Log in</Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}