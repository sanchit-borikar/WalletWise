import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '../theme';

// The four credit bureaus licensed by the RBI. Each must give you one full report free every year.
const BUREAUS: { name: string; url: string }[] = [
  { name: 'CIBIL', url: 'https://www.cibil.com' },
  { name: 'Experian', url: 'https://www.experian.in' },
  { name: 'Equifax', url: 'https://www.equifax.co.in' },
  { name: 'CRIF High Mark', url: 'https://www.crifhighmark.com' },
];

// Keep the bill under this share of the credit limit. The example limit is only an illustration.
const USAGE_SHARE = 0.3;
const EXAMPLE_LIMIT = 20000;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Pay the full bill every month',
    body: 'Pay the "total amount due" by the due date, not the "minimum due". One late payment stays on your report for years. Set up an auto-debit from your bank account so you never forget.',
  },
  {
    title: `Use less than ${Math.round(USAGE_SHARE * 100)}% of your limit`,
    body: `For example, if your limit is ${inr(EXAMPLE_LIMIT)}, try to keep the bill under ${inr(EXAMPLE_LIMIT * USAGE_SHARE)}. Using most of your limit every month looks risky to banks, even when you pay in full.`,
  },
  {
    title: 'Do not apply for many cards at once',
    body: 'Every application is checked on your report. Several applications close together lower your score. Apply for one card, wait at least six months, then think about the next.',
  },
  {
    title: 'Get your free report from each bureau every year',
    body: 'India has four credit bureaus. Each one must give you one full credit report free every year. Download all four, because banks report to different bureaus.',
  },
  {
    title: 'Dispute any mistake',
    body: 'If you see a loan or card that is not yours, a payment marked late that you paid on time, or a wrong name or address, raise a dispute on that bureau’s website. You can also ask the bank to correct it.',
  },
  {
    title: 'Keep your oldest card open',
    body: 'A long history helps your score. If your first card has no annual fee, keep it and use it for a small bill now and then, instead of closing it.',
  },
];

/** A plain six-step plan to build a CIBIL score, for first-time and existing cardholders. */
export default function BuildCreditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60, paddingHorizontal: 20 }}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        Build your CIBIL score
      </Text>
      <Text style={styles.sub}>
        Your credit score tells banks how safely you handle loans and cards. A good score makes it easier to get a card, a loan or a lower interest rate.
        These six steps are all it takes.
      </Text>

      {STEPS.map((s, i) => (
        <View key={s.title} style={styles.step}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepBody}>{s.body}</Text>
            {i === 3 && (
              <View style={styles.bureaus}>
                {BUREAUS.map((b) => (
                  <Pressable
                    key={b.name}
                    style={styles.bureau}
                    onPress={() => WebBrowser.openBrowserAsync(b.url)}
                    accessibilityRole="link"
                    accessibilityLabel={`Open the ${b.name} website`}>
                    <Text style={styles.bureauText}>{b.name} ↗</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}

      <View style={styles.note}>
        <Text style={styles.noteTitle}>No credit history yet?</Text>
        <Text style={styles.noteBody}>
          A card against a fixed deposit needs no salary slip and no credit history, and it builds your score like any other card. Find My Card shows the
          options for your spending.
        </Text>
        <Pressable style={styles.primary} onPress={() => router.push('/find-card')} accessibilityRole="button">
          <Text style={styles.primaryText}>See first-card options</Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        Checking your own report does not lower your score. Never share an OTP, PIN or CVV with anyone who offers to “fix” your score.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  back: { paddingVertical: 8 },
  backText: { fontFamily: typography.fontFamily, color: colors.accent.goldStart, fontSize: 15, fontWeight: '600' },
  title: { fontFamily: typography.fontFamily, color: '#F5F5F5', fontSize: 30, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 },
  sub: { fontFamily: typography.fontFamily, color: '#9A9A9A', fontSize: 14, marginTop: 8, lineHeight: 20, marginBottom: 12 },
  step: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  stepNumber: { fontFamily: typography.fontFamily, color: colors.accent.goldStart, fontSize: 22, fontWeight: '700', width: 26 },
  stepTitle: { fontFamily: typography.fontFamily, color: '#F5F5F5', fontSize: 16, fontWeight: '700' },
  stepBody: { fontFamily: typography.fontFamily, color: '#B0B0B0', fontSize: 14, lineHeight: 20, marginTop: 6 },
  bureaus: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  bureau: { borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#121212', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  bureauText: { fontFamily: typography.fontFamily, color: colors.accent.goldStart, fontSize: 13, fontWeight: '600' },
  note: { backgroundColor: '#111', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(245,208,111,0.35)', padding: 16, marginTop: 24 },
  noteTitle: { fontFamily: typography.fontFamily, color: '#F5F5F5', fontSize: 17, fontWeight: '700' },
  noteBody: { fontFamily: typography.fontFamily, color: '#B0B0B0', fontSize: 14, lineHeight: 20, marginTop: 6 },
  primary: { marginTop: 14, backgroundColor: colors.accent.goldStart, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontFamily: typography.fontFamily, color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  disclaimer: { fontFamily: typography.fontFamily, color: '#6F6F6F', fontSize: 11, lineHeight: 16, marginTop: 20 },
});
