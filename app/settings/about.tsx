import { Text } from 'react-native';
import Constants from 'expo-constants';
import { Page } from '../../src/components/Page';
import { theme } from '../../src/lib/theme';

export default function About() {
  return (
    <Page title="About Us">
      <Text style={{ color: theme.fg, fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -1 }}>Cript</Text>
      <Text style={[theme.type.title, { color: theme.fg, fontWeight: '400' }]}>Talk about it</Text>
      <Text style={[theme.type.body, { color: theme.dim }]}>
        Cript is a voice journal. Talk for a minute, and Cript turns the biggest moment into a title and a short reflection you can look back on.
      </Text>
      <Text style={[theme.type.caption, { color: theme.dim }]}>Version {Constants.expoConfig?.version ?? '—'}</Text>
    </Page>
  );
}
