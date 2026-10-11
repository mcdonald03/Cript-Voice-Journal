import { Text } from 'react-native';
import { Page } from '../../src/components/Page';
import { theme } from '../../src/lib/theme';

export default function Notifications() {
  return (
    <Page title="Notifications">
      <Text style={[theme.type.body, { color: theme.dim }]}>
        Reminders aren’t available yet. A daily journaling nudge will live here.
      </Text>
    </Page>
  );
}
