import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { Block, Bullets, Button, Chip, Field, Heading, Label, Para, Screen, kitStyles } from '../components/screen/ScreenKit';
import { catalog } from '../data/catalog';
import { encodeWalletCode, parseWalletCode } from '../engine/walletCode';
import type { SharedCard } from '../engine/walletCode';
import { useCardStore } from '../store/useCardStore';
import { theme } from '../theme';

const knownIds: ReadonlySet<string> = new Set(catalog.byId.keys());

/** Family and add-on cards: a plain guide, plus "Share my wallet" between phones with no server. */
export default function FamilyScreen() {
  const router = useRouter();
  const holdings = useCardStore((s) => s.holdings);
  const isDemo = useCardStore((s) => s.isDemo);
  const importCards = useCardStore((s) => s.importCards);

  const [withLastFour, setWithLastFour] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');

  const code = useMemo(
    () => encodeWalletCode(holdings.map((h) => ({ catalogId: h.catalogId, lastFour: h.lastFour, points: h.points })), withLastFour),
    [holdings, withLastFour],
  );
  const parsed = useMemo(() => (pasted.trim() ? parseWalletCode(pasted, knownIds) : null), [pasted]);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const paste = async () => setPasted(await Clipboard.getStringAsync());

  const doImport = (cards: SharedCard[]) => {
    importCards(cards);
    setPasted('');
    router.push('/wallet');
  };

  return (
    <Screen title="Family and add-on cards" subtitle="How to share a card safely with your family, and how to copy your wallet to another phone.">
      <Heading>What is an add-on card?</Heading>
      <Block>
        <Bullets
          items={[
            'An add-on card is an extra card on your account for a family member, such as a spouse, parent or child over 18. Each bank lists who can get one.',
            'It shares your card’s credit limit. It is not a new limit.',
            'You, the main cardholder, pay the whole bill, including what the add-on card spends (RBI para 18).',
            'Add-on cards are often free, but some cards charge a fee. Check the Key Fact Statement.',
            'Lounge access for add-on cards varies by card: some share the main card’s visits, some give none. Check the card’s Benefits tab, then confirm with the bank.',
          ]}
        />
      </Block>

      <Heading>Share safely</Heading>
      <Block tone="gold">
        <Bullets
          items={[
            'Give family their own add-on card, with a spending limit set in your bank’s app, instead of lending your card.',
            'Never share your OTP, CVV or PIN, even with family. An OTP approves a payment from your account.',
            'Turn on SMS alerts for every add-on transaction so you see each spend.',
            'Pay the full bill every month. Interest on unpaid add-on spends is charged to you.',
            'An add-on card can help a family member with no credit history get started, but it does not always build their own credit score. Ask the bank whether it reports add-on cards.',
          ]}
        />
      </Block>

      <Block>
        <Label>Pooling points</Label>
        <Para>
          Some banks let family members pool reward points into one account, others do not, and the rules change often. WalletWise
          does not have this data, so ask your bank before you plan a redemption around pooled points.
        </Para>
      </Block>

      <Heading>Share my wallet</Heading>
      <Block>
        <Para>
          Copy a code with your card names and points, then paste it on another phone (yours or a family member’s). No account, no
          server: the code goes only where you send it.
        </Para>
        <Para muted>The code never includes full card numbers, CVV, PIN, expiry dates or your name.</Para>
        {isDemo && <Para muted>You are using the sample cards, so the code holds the sample wallet.</Para>}
        <View style={kitStyles.wrap}>
          <Chip label="Include last 4 digits" selected={withLastFour} onPress={() => setWithLastFour((v) => !v)} />
        </View>
        <View style={styles.code}>
          <Text style={styles.codeText} selectable>
            {code}
          </Text>
        </View>
        <Button label={copied ? 'Copied' : `Copy code (${holdings.length} card${holdings.length === 1 ? '' : 's'})`} onPress={copy} disabled={holdings.length === 0} />
      </Block>

      <Block>
        <Label>Add cards from a code</Label>
        <Field
          value={pasted}
          onChangeText={setPasted}
          placeholder="Paste a WALLETWISE1 code"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.paste}
          accessibilityLabel="Wallet code"
        />
        <Button kind="secondary" label="Paste from clipboard" onPress={paste} />
        {parsed && !parsed.ok && <Para muted>{parsed.error}</Para>}
        {parsed?.ok && (
          <>
            {parsed.cards.map((c, i) => {
              const card = catalog.byId.get(c.catalogId);
              return (
                <View key={`${c.catalogId}-${i}`} style={kitStyles.between}>
                  <Text style={[theme.text.body, kitStyles.value, styles.flex]} numberOfLines={1}>
                    {card?.name ?? c.catalogId}
                    {c.lastFour ? ` ·· ${c.lastFour}` : ''}
                  </Text>
                  <Text style={theme.text.body}>{c.points.toLocaleString('en-IN')} pts</Text>
                </View>
              );
            })}
            {parsed.skipped > 0 && (
              <Para muted>{`${parsed.skipped} card${parsed.skipped === 1 ? '' : 's'} in the code could not be matched and will be left out.`}</Para>
            )}
            <Para muted>
              {isDemo
                ? 'These cards will replace the sample cards.'
                : `These cards will be added to the ${holdings.length} already on this phone.`}
            </Para>
            <Button label={`Add ${parsed.cards.length} card${parsed.cards.length === 1 ? '' : 's'}`} onPress={() => doImport(parsed.cards)} />
          </>
        )}
      </Block>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  codeText: { fontFamily: theme.fontFamily, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  paste: { minHeight: 72, textAlignVertical: 'top' },
  flex: { flex: 1 },
});
