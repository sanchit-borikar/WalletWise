import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';

export type QuickAction = { key: string; title: string; icon: IconName; onPress: () => void };

/** 2 x 2 grid of the main tools. A fixed set of four, so it is a plain View, not a list. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityLabel={a.title}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            <Icon name={a.icon} color={theme.colors.gold} size={theme.sizes.iconLarge} />
          </View>
          <Text style={[theme.text.body, styles.title]} numberOfLines={2}>
            {a.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tile: {
    // Two per row: half the width minus half the gap.
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.sizes.touch + theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  iconWrap: {
    width: theme.sizes.badge,
    height: theme.sizes.badge,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.goldSoft,
  },
  title: { flex: 1, color: theme.colors.textPrimary, fontWeight: '600' },
});
