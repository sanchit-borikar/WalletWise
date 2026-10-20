import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../theme';

/**
 * Small building blocks shared by the plain-language tool screens (Your rights, Is this a scam?,
 * Spends, Family cards). Uses the Home design tokens so they match the rest of the app.
 */

type ScreenProps = { title: string; subtitle?: string; children: React.ReactNode; backLabel?: string };

/** Full screen with a back link, a title and scrolling content. */
export function Screen({ title, subtitle, children, backLabel = 'Back' }: ScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.sm, paddingBottom: insets.bottom + 48 }]}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={theme.spacing.sm}
          style={styles.back}
        >
          <Text style={styles.backText}>← {backLabel}</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && <Text style={theme.text.body}>{subtitle}</Text>}
        {children}
      </ScrollView>
    </View>
  );
}

/** Section heading inside a screen. */
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text style={[theme.text.title, styles.heading]} accessibilityRole="header">
      {children}
    </Text>
  );
}

type BlockProps = { children: React.ReactNode; tone?: 'plain' | 'gold' | 'warning' | 'danger'; style?: object };

/** Rounded panel. */
export function Block({ children, tone = 'plain', style }: BlockProps) {
  return <View style={[styles.block, toneStyle[tone], style]}>{children}</View>;
}

/** Body paragraph. */
export function Para({ children, muted, strong }: { children: React.ReactNode; muted?: boolean; strong?: boolean }) {
  return <Text style={[theme.text.body, muted && styles.muted, strong && styles.strong]}>{children}</Text>;
}

/** Small label above a value or field. */
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={[theme.text.caption, styles.label]}>{children}</Text>;
}

/** Bulleted list of short lines. */
export function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.bullets}>
      {items.map((t) => (
        <View key={t} style={styles.bulletRow}>
          <Text style={[theme.text.body, styles.bulletDot]}>•</Text>
          <Text style={[theme.text.body, styles.flex]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

type ButtonProps = { label: string; onPress: () => void; kind?: 'primary' | 'secondary'; disabled?: boolean; accessibilityHint?: string };

export function Button({ label, onPress, kind = 'primary', disabled, accessibilityHint }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Text style={[styles.buttonText, kind === 'primary' ? styles.primaryText : styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

type ChipProps = { label: string; selected: boolean; onPress: () => void };

/** Choice chip, for example a spend category. */
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[theme.text.caption, selected ? styles.chipTextOn : styles.chipText]}>{label}</Text>
    </Pressable>
  );
}

/** Text field in the dark style. */
export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={theme.colors.textMuted} keyboardAppearance="dark" {...props} style={[styles.field, props.style]} />;
}

const toneStyle = StyleSheet.create({
  plain: {},
  gold: { borderColor: theme.colors.goldBorder, backgroundColor: theme.colors.goldSoft },
  warning: { borderColor: theme.colors.warning, backgroundColor: theme.colors.warningSoft },
  danger: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
});

export const kitStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm },
  value: { color: theme.colors.textPrimary, fontWeight: '600' },
  gold: { color: theme.colors.gold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing.md, gap: theme.spacing.md },
  back: { alignSelf: 'flex-start', minHeight: theme.sizes.touch, justifyContent: 'center' },
  backText: { fontFamily: theme.fontFamily, color: theme.colors.gold, fontSize: theme.fontSize.body, fontWeight: '600' },
  title: { ...theme.text.title, fontSize: 28, lineHeight: 34 },
  heading: { marginTop: theme.spacing.sm },
  block: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  muted: { color: theme.colors.textMuted },
  strong: { color: theme.colors.textPrimary, fontWeight: '600' },
  label: { textTransform: 'uppercase' },
  bullets: { gap: theme.spacing.xs },
  bulletRow: { flexDirection: 'row', gap: theme.spacing.sm },
  bulletDot: { color: theme.colors.gold },
  flex: { flex: 1 },
  button: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.gold },
  secondary: { borderWidth: 1, borderColor: theme.colors.goldBorder },
  dim: { opacity: 0.6 },
  buttonText: { fontFamily: theme.fontFamily, fontSize: theme.fontSize.body, fontWeight: '700' },
  primaryText: { color: theme.colors.onGold },
  secondaryText: { color: theme.colors.gold },
  chip: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
  },
  chipOn: { borderColor: theme.colors.gold, backgroundColor: theme.colors.goldSoft },
  chipText: { color: theme.colors.textSecondary },
  chipTextOn: { color: theme.colors.gold },
  field: {
    fontFamily: theme.fontFamily,
    color: theme.colors.textPrimary,
    fontSize: 16,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
});
