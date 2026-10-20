import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { catalog } from '../../data/catalog';
import { revolvingCost } from '../../engine';
import { useCardStore } from '../../store/useCardStore';
import { theme } from '../../theme';

/** Example bill for the banner. The Bill check screen lets the user enter their own. */
const EXAMPLE_BILL = 10000;

/**
 * Shown on Home only when Find My Card says the user sometimes pays only part of the
 * bill. One number from the engine, one action.
 */
export function BillCheckBanner({ onPress }: { onPress: () => void }) {
  const repayment = useCardStore((s) => s.profile.repayment);
  const holdings = useCardStore((s) => s.holdings);
  const firstRate = catalog.byId.get(holdings[0]?.catalogId ?? '')?.aprMonthlyPct ?? null;
  const result = useMemo(() => revolvingCost({ balance: EXAMPLE_BILL, aprMonthlyPct: firstRate }), [firstRate]);
  if (repayment !== 'SOMETIMES_MINIMUM') return null;

  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const years = result.months != null ? Math.round((result.months / 12) * 10) / 10 : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens Bill check"
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <Text style={[theme.text.caption, styles.kicker]}>PAYING ONLY THE MINIMUM?</Text>
      <Text style={[theme.text.body, styles.text]}>
        {years != null
          ? `A ${inr(EXAMPLE_BILL)} bill paid at the minimum takes about ${years} years and ${inr(result.extraCost)} in interest and GST.`
          : `A ${inr(EXAMPLE_BILL)} bill paid at the minimum may never be cleared.`}
      </Text>
      <View style={styles.row}>
        <Text style={[theme.text.body, styles.action]}>Check your bill →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,90,0.45)',
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  kicker: { color: theme.colors.danger },
  text: { color: theme.colors.textPrimary, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: theme.spacing.sm },
  action: { color: theme.colors.gold, fontWeight: '700' },
});
