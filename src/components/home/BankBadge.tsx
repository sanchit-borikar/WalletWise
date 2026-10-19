import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../../theme';
import { ISSUER_COLORS } from '../CardFace';

const ISSUER_SHORT: Record<string, string> = {
  AMEX: 'AX',
  INDUSIND: 'IB',
  BOB: 'BB',
  IDFC: 'ID',
  FEDERAL: 'FB',
};

/**
 * Round bank mark in the issuer's colour with its short code. Stands in for a
 * bank logo, since the app ships no logo assets.
 */
export function BankBadge({ issuer, small }: { issuer: string; small?: boolean }) {
  const size = small ? theme.sizes.badgeSmall : theme.sizes.badge;
  const colors = ISSUER_COLORS[issuer] ?? [theme.colors.surfaceRaised, theme.colors.surface];
  const label = ISSUER_SHORT[issuer] ?? issuer.slice(0, 2);
  return (
    <View
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <Text style={[theme.text.caption, styles.label, small && styles.labelSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.goldBorder,
  },
  label: { color: theme.colors.gold, fontWeight: '800', letterSpacing: 0.5 },
  labelSmall: { letterSpacing: 0 },
});
