import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { colors, typography } from '../../theme';
import { catalog, DATA_ATTRIBUTION } from '../../data/catalog';
import { CATEGORY_LABELS, toEngineCategory, topCardsForCategory } from '../../engine';

// Card artwork we have locally, keyed by catalog card id.
const CARD_IMAGES: Record<string, number> = {
  'hdfc-infinia': require('../../../travel/1. Infinia.jpg'),
  'hdfc-diners-black': require('../../../travel/2. HDFC-Diners-Club-Black-Credit-Card.png'),
  'axis-atlas': require('../../../travel/3. Axis Atlas.jpg'),
  'axis-magnus': require('../../../travel/4. Axis-Magnus-Credit-Card-image.webp'),
  'hsbc-travelone': require('../../../travel/5. HSBC-TravelOne-CC.webp'),
  'amex-platinum-travel': require('../../../travel/6. American-Express®-Platinum-Travel-Credit-Card.webp'),
  'icici-emeralde-private': require('../../../travel/7. ICICI-Bank-Emeralde-Private-Metal-Credit-Card.webp'),
  'hdfc-regalia-gold': require('../../../travel/8. Regalia.jpg'),
  'hdfc-marriott-bonvoy': require('../../../travel/9. Marriot Bonvoy.webp'),
  'sbi-elite': require('../../../travel/10. elite-sbi-card.png'),
};

const inr = (n: number | null) => (n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);
const TIER_LABELS: Record<string, string> = { ENTRY: 'Entry', MID: 'Mid', PREMIUM: 'Premium', SUPER_PREMIUM: 'Super Premium' };

/** Typical monthly spend used to rank cards for a topic. */
const TOPIC_SPEND = { category: 10000, other: 15000 };

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const categoryId = typeof id === 'string' ? id.toLowerCase() : '';
  const category = toEngineCategory(categoryId, true);
  const displayTitle = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);

  // Ranked by yearly value after fees for ₹10,000 a month in this category and ₹15,000 elsewhere.
  const ranked = useMemo(
    () =>
      topCardsForCategory(catalog, category, {
        monthlyCategorySpend: TOPIC_SPEND.category,
        monthlyOtherSpend: TOPIC_SPEND.other,
        experience: 'SOME',
      }),
    [category],
  );

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['rgba(245, 208, 111, 0.05)', 'transparent']} style={{ height: 400 }} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{displayTitle} Cards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Top {ranked.length} {displayTitle} Cards in India</Text>
          <Text style={styles.heroSub}>
            Ranked by yearly value after fees if you spend {inr(TOPIC_SPEND.category)} a month on{' '}
            {CATEGORY_LABELS[category].toLowerCase()} and {inr(TOPIC_SPEND.other)} on everything else. Values are estimates.
          </Text>
        </View>

        {ranked.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No cards found for &quot;{displayTitle}&quot;.</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {ranked.map(({ card, value }, idx) => {
              const categoryRow = [...card.rewards]
                .filter((r) => r.category === category || r.category === 'DEFAULT')
                .sort((x, y) => y.ratePct - x.ratePct)[0];
              const image = CARD_IMAGES[card.id];
              return (
                <View key={card.id} style={styles.cardContainer}>
                  <View style={styles.cardHeader}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{idx + 1}</Text>
                    </View>
                    <Text style={styles.cardName}>{card.name}</Text>
                  </View>

                  <Pressable style={styles.cardArtWrapper} onPress={() => WebBrowser.openBrowserAsync(card.url)}>
                    {image ? (
                      <Image source={image} style={styles.cardArt} resizeMode="contain" />
                    ) : (
                      <LinearGradient colors={['#1C1C1C', '#0A0A0A']} style={[styles.cardArt, styles.cardPlaceholder]}>
                        <Text style={styles.placeholderBank}>{card.issuer}</Text>
                        <Text style={styles.placeholderName} numberOfLines={2}>{card.name}</Text>
                      </LinearGradient>
                    )}
                    <View style={styles.redirectBadge}>
                      <Text style={styles.redirectBadgeText}>Details ↗</Text>
                    </View>
                  </Pressable>

                  <View style={styles.table}>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Est. yearly value</Text>
                      <Text style={[styles.tableValue, { color: colors.accent.goldStart }]}>{inr(value.net)}</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Tier</Text>
                      <Text style={[styles.tableValue, { color: card.tier === 'SUPER_PREMIUM' ? colors.accent.goldStart : '#FFF' }]}>
                        {TIER_LABELS[card.tier]}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Annual Fee</Text>
                      <Text style={styles.tableValue}>{card.lifetimeFree ? 'Lifetime free' : inr(card.annualFee)}</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Joining Fee</Text>
                      <Text style={styles.tableValue}>{inr(card.joiningFee)}</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Forex %</Text>
                      <Text style={[styles.tableValue, { color: colors.accent.goldStart }]}>
                        {card.forexPct != null ? `${card.forexPct}%` : '—'}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>{CATEGORY_LABELS[category]} reward</Text>
                      <Text style={[styles.tableValue, { color: '#54C78A' }]}>{categoryRow ? `${categoryRow.ratePct}%` : '—'}</Text>
                    </View>
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.tableLabel}>Fee Waiver Limit</Text>
                      <Text style={styles.tableValue}>{inr(card.feeWaiverSpend)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <Text style={styles.attribution}>{DATA_ATTRIBUTION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardPlaceholder: {
    justifyContent: 'flex-end',
    padding: 16,
    borderRadius: 12,
  },
  placeholderBank: {
    fontFamily: typography.fontFamily,
    color: colors.accent.goldStart,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  placeholderName: {
    fontFamily: typography.fontFamily,
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  attribution: {
    fontFamily: typography.fontFamily,
    color: '#6F6F6F',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 24,
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  backIcon: {
    color: colors.accent.goldStart,
    fontSize: 20,
    marginTop: -2
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '600'
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120
  },
  heroSection: {
    marginBottom: 32
  },
  heroTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 28,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 12
  },
  heroSub: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 15
  },
  cardList: {
    gap: 32
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12
  },
  rankBadge: {
    backgroundColor: 'rgba(245, 208, 111, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.3)'
  },
  rankText: {
    color: colors.accent.goldStart,
    fontWeight: '800',
    fontSize: 14
  },
  cardName: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
    flex: 1
  },
  cardArtWrapper: {
    height: 180,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16
  },
  cardArt: {
    width: '100%',
    height: '100%'
  },
  redirectBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(245, 208, 111, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  redirectBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#000'
  },
  cardDesc: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 24
  },
  table: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  tableLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1
  },
  tableValue: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right'
  }
});
