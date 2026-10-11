import { Linking, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientGlow } from '../../src/components/AmbientGlow';
import { Button } from '../../src/components/ui';
import { PRIVACY_URL, TERMS_URL } from '../../src/lib/legal';
import { theme } from '../../src/lib/theme';

const link = { textDecorationLine: 'underline' } as const;

export default function Onboarding() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AmbientGlow y={0.45} intensity={0.9} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.fg, fontSize: 56, lineHeight: 60, fontWeight: '700', letterSpacing: -1.5 }}>
          Cript
        </Text>
        <Text style={[theme.type.title, { color: theme.fg, fontWeight: '400', marginTop: 8 }]}>Talk about it</Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: bottom + 16, gap: 18 }}>
        <Button label="Get Started" onPress={() => router.push('/signup')} />

        <Pressable accessibilityRole="link" hitSlop={12} onPress={() => router.push('/login')} style={{ alignSelf: 'center' }}>
          <Text style={[theme.type.body, { color: theme.dim }]}>
            Already have an account? <Text style={{ color: theme.fg, fontWeight: '600' }}>Log in</Text>
          </Text>
        </Pressable>

        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
          By tapping Get Started, I agree with the{' '}
          <Text accessibilityRole="link" style={link} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
          {' '}and{' '}
          <Text accessibilityRole="link" style={link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}