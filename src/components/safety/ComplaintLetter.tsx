import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { bankComplaintLetter, ombudsmanComplaint, RBI_OMBUDSMAN_URL } from '../../constants/safety';
import { useCardStore } from '../../store/useCardStore';
import { theme } from '../../theme';
import { Block, Button, Chip, Field, Label, Para, kitStyles } from '../screen/ScreenKit';

type Kind = 'bank' | 'ombudsman';

/**
 * Fill-in complaint letter: first to the bank, then (after 30 days without a fair answer) to the RBI Ombudsman.
 * Nothing is sent by the app; the user copies the text into email, the bank's app or cms.rbi.org.in.
 */
export function ComplaintLetter() {
  const cards = useCardStore((s) => s.cards);
  const isDemo = useCardStore((s) => s.isDemo);
  const [kind, setKind] = useState<Kind>('bank');
  const [cardId, setCardId] = useState<string | null>(null);
  const [issue, setIssue] = useState('');
  const [complaintNo, setComplaintNo] = useState('');
  const [copied, setCopied] = useState(false);

  const card = cards.find((c) => c.id === cardId);
  const text = useMemo(() => {
    const fields = {
      bank: card?.bankName ?? '',
      card: card?.cardName ?? '',
      lastFour: card?.lastFour ?? '',
      issue: issue.trim(),
      complaintNo: complaintNo.trim() || undefined,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
    return kind === 'bank' ? bankComplaintLetter(fields) : ombudsmanComplaint(fields);
  }, [kind, card, issue, complaintNo]);

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Block>
      <Label>Write a complaint</Label>
      <View style={kitStyles.wrap}>
        <Chip label="1. To the bank" selected={kind === 'bank'} onPress={() => setKind('bank')} />
        <Chip label="2. To the RBI Ombudsman" selected={kind === 'ombudsman'} onPress={() => setKind('ombudsman')} />
      </View>
      <Para muted>
        {kind === 'bank'
          ? 'Send this to the bank by email or through its app, and keep the reference number it gives you.'
          : 'Use this only after you complained to the bank and it did not reply in 30 days, said no, or gave an answer you are not happy with.'}
      </Para>

      {!isDemo && cards.length > 0 && (
        <>
          <Label>Which card?</Label>
          <View style={kitStyles.wrap}>
            {cards.map((c) => (
              <Chip key={c.id} label={c.cardName} selected={c.id === cardId} onPress={() => setCardId(c.id === cardId ? null : c.id)} />
            ))}
          </View>
        </>
      )}
      <Label>What happened?</Label>
      <Field
        value={issue}
        onChangeText={setIssue}
        multiline
        placeholder="For example: I was charged ₹590 for an upgrade I did not ask for, on 3 October."
        style={styles.multi}
        accessibilityLabel="What happened"
      />
      {kind === 'ombudsman' && (
        <>
          <Label>Bank’s complaint reference (if you have one)</Label>
          <Field value={complaintNo} onChangeText={setComplaintNo} placeholder="Reference number" accessibilityLabel="Bank complaint reference" />
        </>
      )}

      <View style={styles.letter}>
        <Text style={styles.letterText} selectable>
          {text}
        </Text>
      </View>
      <Button label={copied ? 'Copied' : 'Copy letter'} onPress={copy} />
      {kind === 'ombudsman' && (
        <Button kind="secondary" label="Open cms.rbi.org.in" onPress={() => Linking.openURL(RBI_OMBUDSMAN_URL)} />
      )}
    </Block>
  );
}

const styles = StyleSheet.create({
  multi: { minHeight: 88, textAlignVertical: 'top' },
  letter: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  letterText: { fontFamily: theme.fontFamily, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
});
