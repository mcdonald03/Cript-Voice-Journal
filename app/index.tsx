import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { User } from '@supabase/supabase-js';
import { PillNav } from '../src/components/PillNav';
import { BORDER } from '../src/components/ui';
import { displayName } from '../src/lib/auth';
import { sync } from '../src/lib/pipeline';
import { Entry, loadEntries, onChange } from '../src/lib/storage';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/lib/theme';

const DAY = 86400000;
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);
const today = () => startOfDay(Date.now());
const lastSevenDays = () => Array.from({ length: 7 }, (_, i) => startOfDay(Date.now() - (6 - i) * DAY));

// ~40% more compact than before: padding 20→12, radius 24→14, gap 8→5, title 34→21.
// Text is scaled less than 40% on purpose: below ~11pt it's hard to read.
function Card({ e, onOpen }: { e: Entry; onOpen: () => void }) {
  const waiting = e.status === 'pending';
  const failed = waiting && !!e.lastError;
  const title = failed ? 'Couldn’t process this yet' : waiting ? 'Processing…' : e.title;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onOpen}
      style={({ pressed }) => ({
        backgroundColor: theme.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.line,
        padding: 12,
        gap: 5,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Text style={{ color: theme.dim, fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 0.3 }}>
        {new Date(e.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </Text>
      <Text
        numberOfLines={2}
        style={{ color: waiting ? theme.dim : theme.fg, fontSize: 21, lineHeight: 24, fontWeight: '700', letterSpacing: -0.4 }}
      >
        {title}
      </Text>
      {!waiting && !!e.summary && (
        <Text numberOfLines={2} style={{ color: theme.dim, fontSize: 13, lineHeight: 18 }}>
          {e.summary}
        </Text>
      )}
    </Pressable>
  );
}

function Avatar({ user, onPress }: { user: User | null; onPress: () => void }) {
  const initial = (displayName(user) || user?.email || '').trim().charAt(0).toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile"
      hitSlop={8}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {initial ? (
        <Text style={{ color: theme.fg, fontSize: 16, fontWeight: '600' }}>{initial}</Text>
      ) : (
        <Ionicons name="person-outline" size={18} color={theme.fg} />
      )}
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [day, setDay] = useState(today());
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const load = () => loadEntries().then(setEntries);
    load();
    return onChange(load); // feed updates the moment AI finishes
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) return;
      const first = !u.user_metadata?.welcomed;
      setGreeting(first ? 'Welcome to Cript' : 'Welcome back');
      // Cloud flag, so it survives log out, reinstall and other devices
      if (first) supabase.auth.updateUser({ data: { welcomed: true } });
    });
  }, []);

  useFocusEffect(useCallback(() => { sync(); }, []));

  const visible = entries.filter((e) => startOfDay(e.createdAt) === day);
  const heading =
    day === today()
      ? 'Today'
      : new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Card e={item} onOpen={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })} />
        )}
        contentContainerStyle={{ paddingTop: top + 16, paddingHorizontal: 24, paddingBottom: 140, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[theme.type.body, { color: theme.dim }]}>{greeting || ' '}</Text>
                <Text style={[theme.type.display, { color: theme.fg }]}>{heading}</Text>
              </View>
              <Avatar user={user} onPress={() => router.push('/profile')} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {lastSevenDays().map((d) => {
                const selected = d === day;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => { Haptics.selectionAsync(); setDay(d); }}
                    style={{
                      width: 40, paddingVertical: 8, alignItems: 'center', gap: 4, borderRadius: 20,
                      backgroundColor: selected ? theme.fg : 'transparent',
                    }}
                  >
                    <Text style={[theme.type.caption, { color: selected ? theme.bg : theme.dim }]}>
                      {new Date(d).toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </Text>
                    <Text style={[theme.type.body, { fontWeight: '600', color: selected ? theme.bg : theme.fg }]}>
                      {new Date(d).getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={[theme.type.body, { color: theme.dim }]}>No entries yet. Tap the mic to start.</Text>
        }
      />
      <PillNav
        onFeed={() => setDay(today())}
        onSearch={() => router.push('/analytics')}
        onNew={() => router.push('/record')}
      />
    </View>
  );
}