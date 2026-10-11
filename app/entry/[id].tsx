import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File } from 'expo-file-system';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { IconButton } from '../../src/components/IconButton';
import { Button, Message } from '../../src/components/ui';
import { processEntry } from '../../src/lib/pipeline';
import { Entry, loadEntries, localAudio, onChange } from '../../src/lib/storage';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/lib/theme';

const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

// Local file first (works offline); otherwise a short-lived signed URL for entries synced from another device
async function resolveAudio(e: Entry): Promise<string | null> {
  const local = localAudio(e.id);
  if (local.exists) return local.uri;
  if (e.audioUri) {
    try {
      const f = new File(e.audioUri);
      if (f.exists) return f.uri;
    } catch {}
  }
  if (e.audioPath) {
    const { data, error } = await supabase.storage.from('audio').createSignedUrl(e.audioPath, 3600);
    if (!error && data) return data.signedUrl;
  }
  return null;
}

function Player({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const { currentTime, duration, playing, isLoaded } = useAudioPlayerStatus(player);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // The recorder leaves the audio session in record mode, which plays quietly through the earpiece
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }, []);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const toggle = async () => {
    if (playing) return player.pause();
    if (duration > 0 && currentTime >= duration - 0.15) await player.seekTo(0); // replay after finishing
    player.play();
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        borderRadius: 32,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
      }}
    >
      <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onPress={toggle} filled size={52} />
      <View style={{ flex: 1, gap: 8 }}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
          hitSlop={{ top: 14, bottom: 14 }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onPress={(e) => {
            if (duration > 0 && width > 0) player.seekTo((e.nativeEvent.locationX / width) * duration);
          }}
          style={{ height: 4, borderRadius: 2, backgroundColor: theme.line, overflow: 'hidden' }}
        >
          {/* pointerEvents none: otherwise locationX is measured inside this child, not the bar */}
          <View pointerEvents="none" style={{ width: `${progress * 100}%`, height: 4, backgroundColor: theme.fg }} />
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {isLoaded ? (
            <>
              <Text style={[theme.type.caption, { color: theme.dim, fontVariant: ['tabular-nums'] }]}>{mmss(currentTime)}</Text>
              <Text style={[theme.type.caption, { color: theme.dim, fontVariant: ['tabular-nums'] }]}>{mmss(duration)}</Text>
            </>
          ) : (
            <ActivityIndicator size="small" color={theme.dim} />
          )}
        </View>
      </View>
    </View>
  );
}

export default function EntryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined); // undefined = loading, null = not found
  const [audio, setAudio] = useState<string | null | undefined>(undefined);
  const [retrying, setRetrying] = useState(false);

  // Stay live: the AI result fills in while this screen is open
  useEffect(() => {
    const load = () => loadEntries().then((all) => setEntry(all.find((x) => x.id === id) ?? null));
    load();
    return onChange(load);
  }, [id]);

  useEffect(() => {
    if (!entry) return;
    let live = true;
    resolveAudio(entry)
      .then((u) => live && setAudio(u))
      .catch(() => live && setAudio(null));
    return () => { live = false; };
  }, [entry?.id, entry?.audioUri, entry?.audioPath]);

  // Never throws GO_BACK when this is the only route in the stack
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const retry = async () => {
    if (!entry || retrying) return;
    setRetrying(true);
    try { await processEntry(entry); } finally { setRetrying(false); }
  };

  if (entry === undefined) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const pending = entry?.status === 'pending';
  const failed = pending && !!entry?.lastError;
  const when = entry
    ? `${new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · ${new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: top + 12, paddingHorizontal: 24, paddingBottom: bottom + 140, gap: 24 }}
      >
        <View style={{ alignItems: 'flex-start' }}>
          <IconButton icon="chevron-back" label="Back" onPress={back} size={44} />
        </View>

        {entry === null ? (
          <Text style={[theme.type.body, { color: theme.dim }]}>This entry couldn’t be found.</Text>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={[theme.type.caption, { color: theme.dim }]}>{when}</Text>
              <Text style={[theme.type.display, { color: pending ? theme.dim : theme.fg }]}>
                {failed ? 'Couldn’t process this yet' : pending ? 'Processing…' : entry.title}
              </Text>
            </View>

            {failed && (
              <View style={{ gap: 16 }}>
                <Message text={entry.lastError!} />
                <Button label="Retry" onPress={retry} loading={retrying} />
              </View>
            )}

            {!!entry.summary && (
              <View style={{ gap: 8 }}>
                <Text style={[theme.type.caption, { color: theme.dim }]}>SUMMARY</Text>
                <Text selectable style={[theme.type.body, { color: theme.fg }]}>{entry.summary}</Text>
              </View>
            )}

            {!!entry.transcript && (
              <View style={{ gap: 8 }}>
                <Text style={[theme.type.caption, { color: theme.dim }]}>TRANSCRIPT</Text>
                <Text selectable style={[theme.type.body, { color: theme.fg }]}>{entry.transcript}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {entry && (
        <View style={{ position: 'absolute', left: 24, right: 24, bottom: bottom + 16 }}>
          {audio ? (
            <Player uri={audio} />
          ) : audio === null ? (
            <Text style={[theme.type.caption, { color: theme.dim, textAlign: 'center' }]}>
              Audio isn’t available on this device.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
