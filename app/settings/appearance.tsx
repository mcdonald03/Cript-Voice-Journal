import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Page } from '../../src/components/Page';
import { theme } from '../../src/lib/theme';

export default function Appearance() {
  return (
    <Page title="Appearance">
      <View
        accessible
        accessibilityLabel="Dark, selected"
        style={{
          minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line,
        }}
      >
        <Text style={[theme.type.body, { color: theme.fg }]}>Dark</Text>
        <Ionicons name="checkmark" size={20} color={theme.fg} />
      </View>
      <Text style={[theme.type.caption, { color: theme.dim }]}>Cript is pure black by design. More options may come later.</Text>
    </Page>
  );
}
