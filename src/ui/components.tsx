import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { usePalette, radius } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 16 }, style]}>
      {children}
    </View>
  );
}

export function Bar({ value, color, track, height = 8 }: { value: number; color: string; track?: string; height?: number }) {
  const c = usePalette();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function T({
  children,
  style,
  variant = 'body',
  color,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: 'display' | 'title' | 'h2' | 'body' | 'small' | 'label' | 'num';
  color?: string;
  numberOfLines?: number;
}) {
  const c = usePalette();
  const v = styles[variant];
  return (
    <Text numberOfLines={numberOfLines} style={[v, { color: color ?? (variant === 'small' || variant === 'label' ? c.muted : c.ink) }, style]}>
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.danger : kind === 'secondary' ? c.accentSoft : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? '#fff' : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  const c = usePalette();
  const tint = color ?? c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? tint : c.line,
        backgroundColor: selected ? tint + (c.dark ? '33' : '18') : c.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: selected ? tint : c.muted, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
      <T variant="h2">{children}</T>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  num: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
