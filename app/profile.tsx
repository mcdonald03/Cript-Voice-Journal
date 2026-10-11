import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { User } from '@supabase/supabase-js';
import { IconButton } from '../src/components/IconButton';
import { Group, Row } from '../src/components/Settings';
import { BORDER, Button, Message } from '../src/components/ui';
import { displayName, signOutAndClear } from '../src/lib/auth';
import { flushPending } from '../src/lib/pipeline';
import { PRIVACY_URL, SUPPORT_EMAIL } from '../src/lib/legal';
import { loadEntries } from '../src/lib/storage';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/lib/theme';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const pendingCount = async () => (await loadEntries()).filter((e) => e.status === 'pending').length;
const mail = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

type Sub = 'notifications' | 'appearance' | 'about' | 'change-password' | 'change-email' | 'delete-account';

export default function Profile() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsent, setUnsent] = useState<number | null>(null); // entries that would be lost

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  // Never throws GO_BACK when this is the only route in the stack
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const go = (p: Sub) => router.push(`/settings/${p}`);
  const open = (url: string) => Linking.openURL(url).catch(() => setError('Couldn’t open that link on this device.'));

  const logout = async (force = false) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setUnsent(null);
    try {
      if (!force && (await pendingCount()) > 0) {
        await Promise.race([flushPending(), wait(6000)]); // best effort, capped at 6s
        const left = await pendingCount();
        if (left > 0) { setUnsent(left); return; } // ask first; finally resets the button
      }
      const err = await signOutAndClear(); // signs out, then wipes entries + recordings
      if (err) setError(err);
      // success: the root layout swaps to the auth stack and (auth)/_layout lands on onboarding
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log out.');
    } finally {
      setBusy(false); // always runs, so the screen can't stay stuck
    }
  };

  const name = displayName(user);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: top + 12, paddingBottom: bottom + 16 }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 24 }}>
        <IconButton icon="close" label="Close" onPress={close} size={44} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 24 }}
      >
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <Text style={{ color: theme.fg, fontSize: 32, fontWeight: '600' }}>
              {(name || user?.email || '?').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[theme.type.title, { color: theme.fg }]}>{name || 'Your account'}</Text>
          {!!user?.email && <Text style={[theme.type.body, { color: theme.dim }]}>{user.email}</Text>}
        </View>

        <Group title="General">
          <Row label="Notifications" onPress={() => go('notifications')} />
          <Row label="Appearance" onPress={() => go('appearance')} />
        </Group>

        <Group title="Legal">
          <Row label="Privacy Policy" external onPress={() => open(PRIVACY_URL)} />
          <Row label="Help & Support" external onPress={() => open(mail('Cript support'))} />
        </Group>

        <Group title="Us">
          <Row label="Feedback" external onPress={() => open(mail('Cript feedback'))} />
          <Row label="About Us" onPress={() => go('about')} />
        </Group>

        <Group title="Account">
          <Row label="Change Password" onPress={() => go('change-password')} />
          <Row label="Change Email" onPress={() => go('change-email')} />
          <Row label="Delete My Account" danger onPress={() => go('delete-account')} />
        </Group>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, gap: 16 }}>
        <Message text={error} />
        {unsent !== null ? (
          <>
            <Message
              tone="info"
              text={`${unsent} ${unsent === 1 ? 'entry hasn’t' : 'entries haven’t'} uploaded yet. Logging out deletes ${unsent === 1 ? 'it' : 'them'} from this device for good.`}
            />
            <Button variant="outline" label="Log out anyway" onPress={() => logout(true)} loading={busy} />
            <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setUnsent(null)} style={{ alignSelf: 'center' }}>
              <Text style={[theme.type.body, { color: theme.dim }]}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <Button variant="outline" label="Log out" onPress={() => logout()} loading={busy} />
        )}
      </View>
    </View>
  );
}