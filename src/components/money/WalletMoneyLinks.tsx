import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { theme } from '../../theme';

const LINKS = [
  { route: '/missed-rewards', title: 'Missed rewards check', sub: 'Did you use the best card on your recent spends?' },
  { route: '/goal', title: 'Points goals', sub: 'Save points for a trip, a phone, Diwali gifts or a bill credit.' },
] as const;

/** Links from the wallet to the money tools that work on the cards you hold. */
export function WalletMoneyLinks() {
  const router = useRouter();
  return (
    <View style={styles.box}>
      {LINKS.map((l, i) => (
        <Pressable
          key={l.route}
          onPress={() => router.push(l.route)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.8 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{l.title}</Text>
            <Text style={styles.sub}>{l.sub}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, minHeight: theme.sizes.touch },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  title: { fontFamily: theme.fontFamily, color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  sub: { fontFamily: theme.fontFamily, color: '#9A9A9A', fontSize: 13, marginTop: 2, lineHeight: 18 },
  arrow: { color: theme.colors.gold, fontSize: 18 },
});
