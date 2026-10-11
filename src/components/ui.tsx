import { forwardRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, TextInputProps, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientGlow } from './AmbientGlow';
import { theme } from '../lib/theme';

export const BORDER = 'rgba(255,255,255,0.35)';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'solid', icon, loading, disabled }: ButtonProps) {
  const solid = variant === 'solid';
  const color = solid ? theme.bg : theme.fg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: solid ? theme.fg : 'rgba(0,0,0,0.4)',
        borderWidth: solid ? 0 : 1,
        borderColor: BORDER,
        opacity: disabled ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={color} />}
          <Text style={{ color, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Field = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="rgba(255,255,255,0.5)"
      selectionColor={theme.fg}
      keyboardAppearance="dark"
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={[
        {
          height: 56,
          borderRadius: 999,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: focused ? theme.fg : BORDER,
          color: theme.fg,
          fontSize: 16,
        },
        props.style,
      ]}
    />
  );
});

export const PasswordField = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Field ref={ref} {...props} secureTextEntry={!visible} style={{ paddingRight: 56 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={8}
        onPress={() => setVisible(!visible)}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.dim} />
      </Pressable>
    </View>
  );
});

export function Message({ text, tone = 'error' }: { text: string | null; tone?: 'error' | 'info' }) {
  if (!text) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{ color: tone === 'error' ? '#FF8A80' : theme.dim, fontSize: 14, lineHeight: 20, textAlign: 'center' }}
    >
      {text}
    </Text>
  );
}

// Glow + keyboard handling + centered header, shared by login and signup
export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AmbientGlow y={0.42} intensity={0.55} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: top + 64,
            paddingBottom: bottom + 24,
            paddingHorizontal: 24,
            gap: 16,
          }}
        >
          <Text style={[theme.type.display, { color: theme.fg, textAlign: 'center', marginBottom: 16 }]}>
            {title}
          </Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}