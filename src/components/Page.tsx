import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';
import { theme } from '../lib/theme';

export function Page({ title, children }: { title: string; children?: React.ReactNode }) {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: top + 12, paddingHorizontal: 24, paddingBottom: bottom + 24, gap: 20 }}
        >
          <View style={{ alignItems: 'flex-start' }}>
            <IconButton icon="chevron-back" label="Back" onPress={back} size={44} />
          </View>
          <Text accessibilityRole="header" style={[theme.type.display, { color: theme.fg }]}>{title}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
