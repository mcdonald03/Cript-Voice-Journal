import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  filled?: boolean;
  size?: number;
  haptic?: boolean;
};

export function IconButton({ icon, label, onPress, filled, size = 48, haptic = true }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // Feedback fires on touch-down, not on release
      onPressIn={() => haptic && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? theme.fg : 'transparent',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={filled ? theme.bg : theme.fg} />
    </Pressable>
  );
}