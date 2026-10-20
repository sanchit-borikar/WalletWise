import React, { useMemo } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ComplaintLetter } from '../components/safety/ComplaintLetter';
import { Block, Button, Heading, Label, Para, Screen, kitStyles } from '../components/screen/ScreenKit';
import { RBI_DIRECTIONS_NAME, RBI_OMBUDSMAN_URL, RIGHTS, SFB_NOTE } from '../constants/safety';
import { catalog } from '../data/catalog';
import { useCardStore } from '../store/useCardStore';

/** Display names for small finance bank issuer codes in the catalog. */
const ISSUER_NAMES: Record<string, string> = { AU: 'AU', UNITY: 'Unity', SLICE: 'slice', UTKARSH: 'Utkarsh' };

/** "Your rights": what RBI rules promise every cardholder, in plain words, with paragraph numbers. */
export default function RightsScreen() {
  const router = useRouter();
  const holdings = useCardStore((s) => s.holdings);

  const sfb = useMemo(() => {
    const cards = catalog.cards.filter((c) => c.issuerType === 'SFB');
    const mine = holdings.filter((h) => catalog.byId.get(h.catalogId)?.issuerType === 'SFB');
    const name = (issuer: string) => ISSUER_NAMES[issuer] ?? issuer;
    return { count: cards.length, issuers: [...new Set(cards.map((c) => name(c.issuer)))].join(', '), mine: mine.length };
  }, [holdings]);

  return (
    <Screen title="Your rights" subtitle="What RBI rules promise you as a credit card holder. Keep this handy when you talk to your bank.">
      {RIGHTS.map((r) => (
        <Block key={r.key}>
          <View style={kitStyles.between}>
            <Para strong>{r.title}</Para>
          </View>
          <Para>{r.body}</Para>
          <Label>{r.para}</Label>
        </Block>
      ))}

      <Block tone={sfb.mine > 0 ? 'warning' : 'plain'}>
        <Label>Small finance bank cards</Label>
        <Para>{SFB_NOTE}</Para>
        <Para muted>
          {`${sfb.count} cards in WalletWise are from small finance banks (${sfb.issuers}).` +
            (sfb.mine > 0 ? ` ${sfb.mine === 1 ? 'One of your cards is' : `${sfb.mine} of your cards are`} among them.` : '')}
        </Para>
      </Block>

      <Heading>If the bank does not help</Heading>
      <ComplaintLetter />
      <Button kind="secondary" label="RBI Ombudsman: cms.rbi.org.in" onPress={() => Linking.openURL(RBI_OMBUDSMAN_URL)} />
      <Button kind="secondary" label="Is this a scam? Check a call or message" onPress={() => router.push('/scam-check')} />

      <Para muted>
        {`Source: ${RBI_DIRECTIONS_NAME}. A plain-language summary, not legal advice. Your bank’s Most Important Terms and Conditions give the details for your card.`}
      </Para>
    </Screen>
  );
}
