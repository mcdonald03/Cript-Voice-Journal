import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { File } from 'expo-file-system';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { IconButton } from '../src/components/IconButton';
import { processEntry } from '../src/lib/pipeline';
import { localAudio, upsertEntry } from '../src/lib/storage';
import { theme } from '../src/lib/theme';

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function Record() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { isRecording, durationMillis } = useAudioRecorderState(recorder, 250);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false); // blocks double-taps on save/discard

  useEffect(() => {
    (async () => {
      try {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) return setError('Microphone access is off. Enable it in Settings.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setStarted(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // start
      } catch {
        setError('Could not start recording.');
      }
    })();
  }, []);

  const paused = started && !isRecording;
  const togglePause = () => (isRecording ? recorder.pause() : recorder.record());

const save = async () => {
  if (busy.current) return;
  busy.current = true;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // stop
  try {
    await recorder.stop();
    if (!recorder.uri) throw new Error('The recorder returned no file.');
    const src = new File(recorder.uri);
    if (!src.exists) throw new Error('The recording file is missing.');

    const id = Crypto.randomUUID();
    const dest = localAudio(id);
    src.copySync(dest); // copy first; the original is deleted only after the copy is verified
    if (!dest.exists || !dest.size) throw new Error('Could not save the recording.');
    try { src.delete(); } catch {}

    const entry = {
      id,
      createdAt: Date.now(),
      audioUri: dest.uri,
      title: '',
      transcript: '',
      summary: '',
      status: 'pending' as const,
      durationMs: Math.round(durationMillis),
    };
    await upsertEntry(entry); // shows on the feed instantly
    processEntry(entry);      // not awaited: AI + cloud save finish in the background
    router.back();
  } catch (e) {
    busy.current = false;
    Alert.alert('Could not save', e instanceof Error ? e.message : 'The recording failed to save. Please try again.');
  }
};

  const discard = async () => {
    if (busy.current) return;
    busy.current = true;
    if (started) await recorder.stop().catch(() => {});
    router.back();
  };

  // Confirm only when real audio would be lost
  const cancel = () =>
    durationMillis < 2000
      ? discard()
      : Alert.alert('Discard this entry?', undefined, [
          { text: 'Keep recording', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: discard },
        ]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      {/* Bottom-center ambient glow, behind everything */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={vec(width / 2, height)}
              r={height * 0.45}
              colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            />
          </Rect>
        </Canvas>
      </View>

      {error ? (
        <Text style={[theme.type.body, { color: theme.dim, textAlign: 'center', paddingHorizontal: 40 }]}>
          {error}
        </Text>
      ) : (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={[theme.type.caption, { color: theme.dim }]}>{paused ? 'PAUSED' : 'RECORDING'}</Text>
          <Text
            style={{
              color: theme.fg,
              fontSize: 45, // 30% smaller than 64
              lineHeight: 48,
              fontWeight: '300',
              letterSpacing: -1,
              fontVariant: ['tabular-nums'],
            }}
          >
            {mmss(durationMillis)}
          </Text>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          bottom: bottom + 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 8,
          borderRadius: 999,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
        }}
      >
        <IconButton icon="close" label="Discard" onPress={cancel} size={56} />
        {!error && (
          <IconButton
            icon={paused ? 'play' : 'pause'}
            label={paused ? 'Resume' : 'Pause'}
            onPress={togglePause}
            size={56}
          />
        )}
        {!error && <IconButton icon="checkmark" label="Save" onPress={save} filled size={56} haptic={false} />}
      </View>
    </View>
  );
}