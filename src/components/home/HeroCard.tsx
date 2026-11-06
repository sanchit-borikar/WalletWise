import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../../theme';

type Props = {
  /** Guaranteed value of all points (default redemption route), in rupees. */
  totalMin: number;
  /** Value with the best realistic redemptions, in rupees. */
  totalMax: number;
  cardCount: number;
  totalPoints: number;
  isDemo: boolean;
  onSeeHow: () => void;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** What all the user's points are worth: the first thing they see on Home. */
export function HeroCard({ totalMin, totalMax, cardCount, totalPoints, isDemo, onSeeHow }: Props) {
  const summary = `${cardCount} ${cardCount === 1 ? 'card' : 'cards'} • ${totalPoints.toLocaleString('en-IN')} reward points`;
  return (
    // A plain container (not a button) so the "See how" link stays reachable by screen readers.
    <View style={styles.card}>
      <LinearGradient colors={theme.colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.labelRow}>
        <Text style={theme.text.caption}>YOUR POINTS ARE WORTH</Text>
        {isDemo && (
          <View style={styles.demoChip}>
            <Text style={[theme.text.caption, styles.demoText]}>Sample cards</Text>
          </View>
        )}
      </View>
      <Text
        style={[theme.text.title, styles.value]}
        adjustsFontSizeToFit
        numberOfLines={1}
        accessibilityLabel={`Your points are worth ${inr(totalMin)}`}
      >
        {inr(totalMin)}
      </Text>

      {totalMax > totalMin ? (
        <View style={styles.bestRow}>
          <Text style={[theme.text.body, styles.best]}>Up to {inr(totalMax)} with best redemptions</Text>
          <Pressable
            onPress={onSeeHow}
            accessibilityRole="link"
            accessibilityLabel="See how to get the best redemption value"
            hitSlop={theme.spacing.sm}
            style={({ pressed }) => [styles.seeHow, pressed && styles.pressedLink]}
          >
            <Text style={[theme.text.body, styles.seeHowText]}>See how →</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={theme.text.body}>At the default redemption value</Text>
      )}

      <View style={styles.divider} />
      <Text style={[theme.text.body, styles.summary]}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.goldBorder,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.goldSoft,
  },
  demoText: { color: theme.colors.gold },
  value: { fontSize: theme.fontSize.hero, lineHeight: theme.fontSize.hero + theme.spacing.sm, marginTop: theme.spacing.sm },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  best: { color: theme.colors.positive, flexShrink: 1 },
  seeHow: { minHeight: theme.sizes.touch, justifyContent: 'center', paddingHorizontal: theme.spacing.xs, borderRadius: theme.radius.sm },
  pressedLink: { backgroundColor: theme.colors.pressed },
  seeHowText: { color: theme.colors.gold, fontWeight: '700' },
  divider: { height: theme.sizes.hairline, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },
  summary: { color: theme.colors.textPrimary, fontWeight: '600' },
});
