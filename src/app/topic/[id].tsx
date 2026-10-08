import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { colors, typography } from '../../theme';

// --- MOCK DATABASE FOR TOPIC CARDS ---
const TOP_CARDS_DB: Record<string, any[]> = {
  travel: [
    {
      id: 'hdfc-infinia',
      name: 'HDFC Infinia Metal',
      image: require('../../../travel/1. Infinia.jpg'),
      tier: 'Super Premium',
      annualFee: '₹12,500',
      joiningFee: '₹12,500',
      ltf: 'No',
      forex: '2.0%',
      feeWaiver: '₹10,00,000',
      reward: '3.33–33.33%',
      url: 'https://www.hdfc.bank.in/credit-cards/infinia-credit-card'
    },
    {
      id: 'hdfc-diners-black',
      name: 'HDFC Diners Club Black Metal',
      image: require('../../../travel/2. HDFC-Diners-Club-Black-Credit-Card.png'),
      tier: 'Super Premium',
      annualFee: '₹10,000',
      joiningFee: '₹10,000',
      ltf: 'No',
      forex: '2.0%',
      feeWaiver: '₹8,00,000',
      reward: '3.33–33.33%',
      url: 'https://www.hdfc.bank.in/credit-cards/diners-club-black-metal-edition-credit-card'
    },
    {
      id: 'axis-atlas',
      name: 'Axis Atlas',
      image: require('../../../travel/3. Axis Atlas.jpg'),
      tier: 'Premium',
      annualFee: '₹5,000',
      joiningFee: '₹5,000',
      ltf: 'No',
      forex: '3.5%',
      feeWaiver: '₹7,50,000',
      reward: '2–4%',
      url: 'https://www.axis.bank.in/cards/credit-card/axis-bank-atlas-credit-card'
    },
    {
      id: 'axis-magnus',
      name: 'Axis Magnus',
      image: require('../../../travel/4. Axis-Magnus-Credit-Card-image.webp'),
      tier: 'Super Premium',
      annualFee: '₹12,500',
      joiningFee: '₹12,500',
      ltf: 'No',
      forex: '2.0%',
      feeWaiver: '₹25,00,000',
      reward: '2.5–12.5%',
      url: 'https://www.axis.bank.in/cards/credit-card/axis-bank-magnus-credit-card'
    },
    {
      id: 'hsbc-travelone',
      name: 'HSBC TravelOne',
      image: require('../../../travel/5. HSBC-TravelOne-CC.webp'),
      tier: 'Premium',
      annualFee: '₹4,999',
      joiningFee: '₹4,999',
      ltf: 'No',
      forex: '3.5%',
      feeWaiver: '₹8,00,000',
      reward: '1.5–6%',
      url: 'https://www.hsbc.bank.in/credit-cards/products/travelone/'
    },
    {
      id: 'amex-plat-travel',
      name: 'Amex Platinum Travel',
      image: require('../../../travel/6. American-Express®-Platinum-Travel-Credit-Card.webp'),
      tier: 'Premium',
      annualFee: '₹5,000',
      joiningFee: '₹5,000',
      ltf: 'No',
      forex: '3.5%',
      feeWaiver: '—',
      reward: '1.33–4%',
      url: 'https://www.americanexpress.com/in/credit-cards/card-types/travel-rewards-cards/'
    },
    {
      id: 'icici-emeralde',
      name: 'ICICI Emeralde Private Metal',
      image: require('../../../travel/7. ICICI-Bank-Emeralde-Private-Metal-Credit-Card.webp'),
      tier: 'Super Premium',
      annualFee: '₹12,499',
      joiningFee: '₹12,499',
      ltf: 'No',
      forex: '2.0%',
      feeWaiver: '₹10,00,000',
      reward: '2.5–12.5%',
      url: 'https://www.icicibank.com/personal-banking/cards/credit-card'
    },
    {
      id: 'hdfc-regalia-gold',
      name: 'HDFC Regalia Gold',
      image: require('../../../travel/8. Regalia.jpg'),
      tier: 'Premium',
      annualFee: '₹2,500',
      joiningFee: '₹2,500',
      ltf: 'No',
      forex: '2.5%',
      feeWaiver: '₹4,00,000',
      reward: '1.33–5%',
      url: 'https://www.hdfc.bank.in/credit-cards/regalia-gold-credit-card'
    },
    {
      id: 'marriott-bonvoy',
      name: 'Marriott Bonvoy HDFC',
      image: require('../../../travel/9. Marriot Bonvoy.webp'),
      tier: 'Premium',
      annualFee: '₹3,000',
      joiningFee: '₹3,000',
      ltf: 'No',
      forex: '3.5%',
      feeWaiver: '—',
      reward: '2–6%',
      url: 'https://www.hdfc.bank.in/credit-cards/marriott-bonvoy-credit-card'
    },
    {
      id: 'sbi-elite',
      name: 'SBI Card ELITE',
      image: require('../../../travel/10. elite-sbi-card.png'),
      tier: 'Premium',
      annualFee: '₹4,999',
      joiningFee: '₹4,999',
      ltf: 'No',
      forex: '3.5%',
      feeWaiver: '₹6,00,000',
      reward: '2–10%',
      url: 'https://www.sbicard.com/en/personal/credit-cards/sbi-card-elite.html'
    }
  ],
};

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  // Clean up ID and get data
  const categoryId = typeof id === 'string' ? id.toLowerCase() : '';
  const cards = TOP_CARDS_DB[categoryId] || [];
  
  const displayTitle = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);

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
          <Text style={styles.heroTitle}>Top 10 {displayTitle} Cards in India</Text>
          <Text style={styles.heroSub}>
            Discover the best cards optimized for {categoryId}. Compare features, conversion rates, and hidden fees.
          </Text>
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No premium guide available yet for "{displayTitle}". Check back soon!</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {cards.map((card, idx) => (
              <View key={card.id} style={styles.cardContainer}>
                <View style={styles.cardHeader}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <Text style={styles.cardName}>{card.name}</Text>
                </View>

                <Pressable 
                  style={styles.cardArtWrapper}
                  onPress={async () => {
                    if (card.url) {
                      await WebBrowser.openBrowserAsync(card.url);
                    }
                  }}
                >
                  <Image source={card.image} style={styles.cardArt} resizeMode="contain" />
                  <View style={styles.redirectBadge}>
                    <Text style={styles.redirectBadgeText}>Apply Now ↗</Text>
                  </View>
                </Pressable>

                {/* Tabular Data Grid */}
                <View style={styles.table}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Tier</Text>
                    <Text style={[styles.tableValue, { color: card.tier === 'Super Premium' ? colors.accent.goldStart : '#FFF' }]}>{card.tier}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Annual Fee</Text>
                    <Text style={styles.tableValue}>{card.annualFee}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Joining Fee</Text>
                    <Text style={styles.tableValue}>{card.joiningFee}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>LTF</Text>
                    <Text style={styles.tableValue}>{card.ltf}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Forex %</Text>
                    <Text style={[styles.tableValue, { color: colors.accent.goldStart }]}>{card.forex}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Reward %</Text>
                    <Text style={[styles.tableValue, { color: '#54C78A' }]}>{card.reward}</Text>
                  </View>
                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.tableLabel}>Fee Waiver Limit</Text>
                    <Text style={styles.tableValue}>{card.feeWaiver}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
