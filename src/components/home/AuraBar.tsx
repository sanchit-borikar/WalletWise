import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme';
import { Icon } from '../Icon';

/** Slim entry to Aura. The centre tab button stays the main way in. */
export function AuraBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask Aura, the WalletWise assistant"
      accessibilityHint="Opens the Aura chat"
      style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon name="sparkle" color={theme.colors.gold} size={theme.sizes.icon} />
      </View>
      <Text style={[theme.text.body, styles.text]} numberOfLines={1}>
        <Text style={styles.strong}>Ask Aura: </Text>which card, which trip…
      </Text>
      <Icon name="chevron-right" color={theme.colors.textMuted} size={theme.sizes.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.sizes.touch + theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  iconWrap: {
    width: theme.sizes.badgeSmall,
    height: theme.sizes.badgeSmall,
    borderRadius: theme.sizes.badgeSmall / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.goldSoft,
  },
  text: { flex: 1 },
  strong: { color: theme.colors.textPrimary, fontWeight: '700' },
});
