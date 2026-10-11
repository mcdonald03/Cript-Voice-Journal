import { Stack } from 'expo-router';
import { theme } from '../../src/lib/theme';

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: 'slide_from_right' }} />;
}
