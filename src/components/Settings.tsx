import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={[theme.type.caption, { color: theme.dim, paddingHorizontal: 4 }]}>{title}</Text>
      <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' }}>
        {Children.toArray(children).map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.line, marginLeft: 16 }} />}
            {c}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

type RowProps = { label: string; onPress: () => void; external?: boolean; danger?: boolean };

export function Row({ label, onPress, external, danger }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={external ? 'Opens outside the app' : undefined}
      onPressIn={() => Haptics.selectionAsync()}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
      })}
    >
      <Text style={[theme.type.body, { color: danger ? '#FF8A80' : theme.fg }]}>{label}</Text>
      <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={18} color={theme.dim} />
    </Pressable>
  );
}
