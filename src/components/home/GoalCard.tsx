import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { catalog } from '../../data/catalog';
import { goalProgress } from '../../engine';
import type { GoalProgress, UserProfile } from '../../engine';
import { useCardStore } from '../../store/useCardStore';
import type { Goal, Holding } from '../../store/useCardStore';
import { theme } from '../../theme';

/** The holdings whose points count towards a goal (all cards when none are picked). */
export function goalHoldings(goal: Goal, holdings: Holding[]) {
  const picked = goal.holdingIds.length > 0 ? holdings.filter((h) => goal.holdingIds.includes(h.id)) : holdings;
  return picked.map((h) => ({ cardId: h.catalogId, points: h.points }));
}

export function progressFor(goal: Goal, holdings: Holding[], profile: UserProfile | null): GoalProgress {
  return goalProgress(catalog, goal.targetRs, goalHoldings(goal, holdings), profile);
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Compact progress for the user's first goal. Hidden when there are no goals. */
export function GoalCard({ onPress }: { onPress: () => void }) {
  const goals = useCardStore((s) => s.goals);
  const holdings = useCardStore((s) => s.holdings);
  const profile = useCardStore((s) => s.profile);
  const goal = goals?.[0];
  if (!goal) return null;
  const p = progressFor(goal, holdings, profile);
  const pct = Math.round(p.progress * 100);
  const more = (goals?.length ?? 0) - 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Goal ${goal.name}: ${pct} percent, ${inr(p.safeRs)} of ${inr(p.targetRs)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={[theme.text.caption]}>YOUR GOAL{more > 0 ? ` · +${more} MORE` : ''}</Text>
        <Text style={[theme.text.caption, { color: theme.colors.gold }]}>{pct}%</Text>
      </View>
      <Text style={[theme.text.body, styles.name]} numberOfLines={1}>
        {goal.name}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, pct)}%` }]} />
      </View>
      <Text style={[theme.text.body, styles.detail]}>
        {inr(p.safeRs)} of {inr(p.targetRs)} in points
        {p.shortfallRs === 0 ? ' · reached!' : p.monthsToGoal != null ? ` · about ${p.monthsToGoal} months to go` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.goldBorder,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceRaised, marginTop: theme.spacing.sm, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.gold },
  detail: { fontSize: 13, marginTop: 6 },
});
