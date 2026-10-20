import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { catalog } from '../../data/catalog';
import { currentMonth, monthSummary } from '../../engine/budget';
import { useCardStore } from '../../store/useCardStore';
import { theme } from '../../theme';
import { Icon } from '../Icon';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Home: this month's logged spends and rewards, linking to the Spends screen. */
export function SpendsSummaryCard() {
  const router = useRouter();
  const spends = useCardStore((s) => s.spends);
  const cards = useCardStore((s) => s.cards);
  const profile = useCardStore((s) => s.profile);

  const summary = useMemo(() => {
    const holdings = cards.map((c) => ({ id: c.id, catalogId: c.catalogId, label: c.cardName }));
    return monthSummary(catalog, spends, holdings, profile.monthlySpend, currentMonth(), profile.experience);
  }, [spends, cards, profile]);
  const rewards = summary.cards.reduce((acc, c) => acc + c.rewardsRs, 0);

  const line =
    summary.total > 0
      ? `${inr(summary.total)} spent${summary.budgetTotal > 0 ? ` of ${inr(summary.budgetTotal)}` : ''} · about ${inr(rewards)} in rewards`
      : 'Log a spend to see your month against your budget and the rewards you earned.';

  return (
    <Pressable
      onPress={() => router.push('/spends')}
      accessibilityRole="button"
      accessibilityLabel={`This month's spends. ${line}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={[theme.text.body, styles.title]}>This month’s spends</Text>
        <Text style={theme.text.body}>{line}</Text>
      </View>
      <Icon name="chevron-right" color={theme.colors.textMuted} />
    </Pressable>
  );
}

/** Home: entry to the rights and scam-check screens. */
export function StaySafeCard() {
  const router = useRouter();
  return (
    <View style={[styles.card, styles.safe]}>
      <View style={styles.text}>
        <Text style={[theme.text.body, styles.title]}>Stay safe</Text>
        <Text style={theme.text.body}>Your bank will never ask for your OTP, CVV or PIN. Check a call or message, and know your RBI rights.</Text>
        <View style={styles.links}>
          <Pressable onPress={() => router.push('/scam-check')} accessibilityRole="button" style={styles.link} hitSlop={6}>
            <Text style={styles.linkText}>Is this a scam?</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/rights')} accessibilityRole="button" style={styles.link} hitSlop={6}>
            <Text style={styles.linkText}>Your rights</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  safe: { borderColor: theme.colors.goldBorder },
  pressed: { backgroundColor: theme.colors.pressed },
  text: { flex: 1, gap: theme.spacing.xs },
  title: { color: theme.colors.textPrimary, fontWeight: '700' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  link: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
    justifyContent: 'center',
  },
  linkText: { fontFamily: theme.fontFamily, color: theme.colors.gold, fontWeight: '600', fontSize: 14 },
});
