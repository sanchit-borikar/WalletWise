import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Block, Bullets, Button, Heading, Label, Para, Screen } from '../components/screen/ScreenKit';
import { CYBERCRIME_HELPLINE, CYBERCRIME_URL, IF_SCAMMED, NEVER_SHARE, SCAM_TRICKS } from '../constants/safety';
import { theme } from '../theme';

/** "Is this a scam?": tick what happened, see whether it is a known trick and what to do. */
export default function ScamCheckScreen() {
  const router = useRouter();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Screen title="Is this a scam?" subtitle="Tick anything that happened to you. Each one is a common trick used on Indian cardholders.">
      <Block tone="danger">
        <Para strong>Never share these with anyone, even someone who says they are from your bank:</Para>
        <Para>{NEVER_SHARE.join(' · ')}</Para>
        <Para muted>Your bank will never ask for them on a call, SMS, email or WhatsApp.</Para>
      </Block>

      {SCAM_TRICKS.map((t) => {
        const on = ticked.has(t.key);
        return (
          <Pressable
            key={t.key}
            onPress={() => toggle(t.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={`${t.title}. ${t.sign}`}
            style={[styles.item, on && styles.itemOn]}
          >
            <View style={styles.itemHead}>
              <View style={[styles.box, on && styles.boxOn]}>{on && <Text style={styles.tick}>✓</Text>}</View>
              <Text style={[theme.text.body, styles.itemTitle]}>{t.title}</Text>
            </View>
            <Text style={theme.text.body}>{t.sign}</Text>
            {on && (
              <View style={styles.doThis}>
                <Label>This is a scam. What to do</Label>
                <Text style={[theme.text.body, styles.doText]}>{t.doThis}</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {ticked.size > 0 && (
        <Block tone="warning">
          <Para strong>
            {ticked.size === 1 ? 'This matches a known scam.' : `These ${ticked.size} signs match known scams.`} Stop talking to
            the caller or sender.
          </Para>
          <Para>If you shared an OTP, PIN or card details, or money has left your account, act now:</Para>
        </Block>
      )}

      <Heading>If you have been cheated</Heading>
      <Block>
        <Bullets items={IF_SCAMMED} />
      </Block>
      <Button label={`Call ${CYBERCRIME_HELPLINE} (cybercrime helpline)`} onPress={() => Linking.openURL(`tel:${CYBERCRIME_HELPLINE}`)} />
      <Button kind="secondary" label="Report at cybercrime.gov.in" onPress={() => Linking.openURL(CYBERCRIME_URL)} />
      <Button kind="secondary" label="Your rights and a complaint letter" onPress={() => router.push('/rights')} />
      <Para muted>Always call your bank on the number printed on the back of your card or shown in its official app.</Para>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemOn: { borderColor: theme.colors.danger },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  itemTitle: { flex: 1, color: theme.colors.textPrimary, fontWeight: '600' },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderColor: theme.colors.danger, backgroundColor: theme.colors.danger },
  tick: { color: theme.colors.onGold, fontWeight: '800' },
  doThis: { gap: theme.spacing.xs, paddingTop: theme.spacing.xs },
  doText: { color: theme.colors.textPrimary },
});
