import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalog } from '../../data/catalog';
import { searchCards } from '../../engine';
import { useCardStore } from '../../store/useCardStore';
import { theme } from '../../theme';

/**
 * Small building blocks shared by the money tools (Bill check, Browse cards, Goals,
 * Missed rewards), so the four screens look the same.
 */

/** ₹ with Indian digit grouping: ₹1,23,456. */
export const inr = (n: number) => `${n < 0 ? '−' : ''}₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
/** Digits only, as a number (0 when empty). */
export const toNumber = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0;

export function MoneyScreen({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60, paddingHorizontal: theme.spacing.md + 4 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
      {children}
    </ScrollView>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function MoneyInput({
  value,
  onChangeText,
  placeholder,
  prefix = '₹',
  suffix,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.inputBox}>
      {!!prefix && <Text style={styles.affix}>{prefix}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '0'}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        keyboardAppearance="dark"
        accessibilityLabel={accessibilityLabel}
      />
      {!!suffix && <Text style={styles.affix}>{suffix}</Text>}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | T[];
  onChange: (v: T) => void;
}) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole={Array.isArray(value) ? 'checkbox' : 'radio'}
          accessibilityState={Array.isArray(value) ? { checked: isOn(o.value) } : { selected: isOn(o.value) }}
          style={[styles.chip, isOn(o.value) && styles.chipOn]}
        >
          <Text style={[styles.chipText, isOn(o.value) && styles.chipTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Panel({ children, tone = 'plain', style }: { children: React.ReactNode; tone?: 'plain' | 'gold' | 'danger' | 'good'; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, tone === 'gold' && styles.panelGold, tone === 'danger' && styles.panelDanger, tone === 'good' && styles.panelGood, style]}>{children}</View>;
}

export function StatRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'danger' | 'good' | 'gold' }) {
  const color = tone === 'danger' ? theme.colors.danger : tone === 'good' ? theme.colors.positive : tone === 'gold' ? theme.colors.gold : theme.colors.textPrimary;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }, strong && styles.statStrong]}>{value}</Text>
    </View>
  );
}

export function Notes({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      {items.map((n) => (
        <Text key={n} style={styles.note}>
          • {n}
        </Text>
      ))}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, disabled && styles.primaryDisabled, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.link} hitSlop={8}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

/**
 * Pick a wallet card, or search all catalog cards. Returns the catalog id.
 * Used where only the card's rates matter (interest, rewards).
 */
export function CardPicker({ value, onChange, allowCatalog = true }: { value: string | null; onChange: (catalogId: string) => void; allowCatalog?: boolean }) {
  const holdings = useCardStore((s) => s.holdings);
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query.trim().length >= 2 ? searchCards(catalog, query, 6) : []), [query]);
  const picked = value ? catalog.byId.get(value) : null;
  const inWallet = holdings.some((h) => h.catalogId === value);

  return (
    <View>
      {holdings.length > 0 && (
        <Chips
          options={holdings.map((h) => ({ value: h.catalogId, label: `${h.bankName.replace(/ BANK$/, '')} ${h.cardName}` }))}
          value={value ?? ''}
          onChange={onChange}
        />
      )}
      {allowCatalog && (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={holdings.length > 0 ? 'Or search any card' : 'Search a card, e.g. SBI Cashback'}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.inputBox, styles.input, styles.search]}
            keyboardAppearance="dark"
            accessibilityLabel="Search any card"
          />
          {results.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                onChange(c.id);
                setQuery('');
              }}
              style={styles.resultRow}
              accessibilityRole="button"
            >
              <Text style={styles.resultText} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </>
      )}
      {picked && !inWallet && <Text style={styles.pickedText}>Using: {picked.name}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  back: { paddingVertical: theme.spacing.sm, alignSelf: 'flex-start', minHeight: theme.sizes.touch, justifyContent: 'center' },
  backText: { fontFamily: theme.fontFamily, color: theme.colors.gold, fontSize: 15, fontWeight: '600' },
  title: { fontFamily: theme.fontFamily, color: theme.colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  sub: { ...theme.text.body, marginTop: theme.spacing.sm },
  label: { ...theme.text.caption, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  body: { ...theme.text.body },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm + 2,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.sm + 2,
  },
  input: { flex: 1, fontFamily: theme.fontFamily, color: theme.colors.textPrimary, fontSize: 16, paddingVertical: 10, minHeight: theme.sizes.touch },
  affix: { color: theme.colors.textMuted, fontSize: 16, marginHorizontal: 4 },
  search: { marginTop: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    minHeight: theme.sizes.touch - 4,
    justifyContent: 'center',
  },
  chipOn: { borderColor: theme.colors.gold, backgroundColor: theme.colors.goldSoft },
  chipText: { fontFamily: theme.fontFamily, color: theme.colors.textSecondary, fontSize: 14 },
  chipTextOn: { color: theme.colors.gold, fontWeight: '600' },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  panelGold: { borderColor: theme.colors.goldBorder },
  panelDanger: { borderColor: 'rgba(255,107,90,0.45)', backgroundColor: theme.colors.dangerSoft },
  panelGood: { borderColor: 'rgba(95,211,148,0.45)' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 5, gap: theme.spacing.md },
  statLabel: { ...theme.text.body, flex: 1 },
  statValue: { fontFamily: theme.fontFamily, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  statStrong: { fontSize: 20, fontWeight: '700' },
  note: { ...theme.text.body, fontSize: 13, lineHeight: 19, color: theme.colors.textMuted },
  primary: { marginTop: theme.spacing.lg, backgroundColor: theme.colors.gold, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { fontFamily: theme.fontFamily, color: theme.colors.onGold, fontSize: 16, fontWeight: '700' },
  link: { minHeight: theme.sizes.touch, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontFamily: theme.fontFamily, color: theme.colors.gold, fontSize: 15, fontWeight: '600' },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  resultText: { ...theme.text.body, color: theme.colors.textPrimary },
  pickedText: { ...theme.text.body, color: theme.colors.gold, marginTop: theme.spacing.sm },
});
