import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';
import { theme } from '../lib/theme';

type Props = { onFeed: () => void; onSearch: () => void; onNew: () => void };

export function PillNav({ onFeed, onSearch, onNew }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none" // taps outside the pill reach the feed
      style={{ position: 'absolute', left: 0, right: 0, bottom: bottom + 16, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 8,
          borderRadius: 999,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
        }}
      >
        <IconButton icon="albums" label="Feed" onPress={onFeed} />
        <IconButton icon="calendar-outline" label="Insights" onPress={onSearch} />
        <IconButton icon="mic" label="New entry" onPress={onNew} filled size={56} />
      </View>
    </View>
  );
}