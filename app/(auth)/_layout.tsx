import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { theme } from '../../src/lib/theme';

export const unstable_settings = { initialRouteName: 'onboarding' };

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments() as string[];

  // After a logout this stack mounts as the profile modal disappears: land on onboarding explicitly
  useEffect(() => {
    if (segments[0] !== '(auth)') router.replace('/onboarding');
  }, [segments]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: 'fade' }} />;
}