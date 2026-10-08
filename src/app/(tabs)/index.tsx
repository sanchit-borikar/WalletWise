import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../theme';
import { useCardStore } from '../../store/useCardStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
const MOCK_ACTIVITY = [
  { id: '1', type: 'Transfer', merchant: 'To Bank Account', time: 'Today, 2:30 PM', amount: -150 },
  { id: '2', type: 'Payment', merchant: 'Swiggy', time: 'Today, 1:10 PM', amount: -450 },
];

const MOCK_REWARDS = [
  { id: '1', name: 'HDFC Infinia', points: '24,000 pts', value: '≈ ₹12,000' },
  { id: '2', name: 'BPCL Octane', points: '4,200 pts', value: '≈ ₹1,050' },
  { id: '3', name: 'Amex Platinum', points: '15,000 pts', value: '≈ ₹4,500' },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function PressableScale({ children, style, onPress, scaleTo = 0.96 }: any) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withSpring(scaleTo, { damping: 20, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 300 }))}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

function SectionTitle({ title, style }: { title: string, style?: any }) {
  return <Text style={[styles.sectionTitle, style]}>{title}</Text>;
}

function AnimatedReveal({ children, delay, translateY = 20, style }: any) {
  const opacity = useSharedValue(0);
  const transY = useSharedValue(translateY);
  const scale = useSharedValue(0.97);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    transY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 150 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 20, stiffness: 150 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }, { scale: scale.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────

function DynamicHeader({ scrollY, delayOffset }: { scrollY: SharedValue<number>, delayOffset: number }) {
  const insets = useSafeAreaInsets();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const headerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 100], [0, 5], Extrapolation.CLAMP) }
    ],
  }));

  return (
    <Animated.View style={[styles.header, { paddingTop: insets.top + 12 }, headerStyle]}>
      <View>
        <AnimatedReveal delay={delayOffset} translateY={-12}>
          <Text style={styles.headerGreeting}>{getGreeting()}, Veer</Text>
        </AnimatedReveal>
        <AnimatedReveal delay={delayOffset + 60} translateY={-8}>
          <Text style={styles.headerSubtitle}>Welcome to WalletWise</Text>
        </AnimatedReveal>
      </View>
      <View style={styles.headerActions}>
        <AnimatedReveal delay={delayOffset + 120} scale={0.75} translateY={0}>
          <PressableScale style={styles.iconButton}>
            <Text style={styles.iconText}>🔔</Text>
            <View style={styles.notificationBadge} />
          </PressableScale>
        </AnimatedReveal>
        <AnimatedReveal delay={delayOffset + 160} scale={0.75} translateY={0}>
          <PressableScale style={[styles.iconButton, { marginLeft: 12 }]}>
            <Text style={[styles.iconText, { color: '#F5F5F5' }]}>⚙</Text>
          </PressableScale>
        </AnimatedReveal>
      </View>
    </Animated.View>
  );
}

function FinancialSnapshot({ scrollY, delayOffset }: { scrollY: SharedValue<number>, delayOffset: number }) {
  const animatedNumber = useSharedValue(0);
  
  useEffect(() => {
    animatedNumber.value = withDelay(
      delayOffset + 300,
      withTiming(24500, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const formatted = `₹${Math.round(animatedNumber.value).toLocaleString()}`;
    return { text: formatted, defaultValue: formatted };
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, 200], [1, 0.97], Extrapolation.CLAMP) }]
  }));

  return (
    <AnimatedReveal delay={delayOffset} style={style}>
      <PressableScale style={styles.snapshotCard} scaleTo={0.98}>
        <LinearGradient
          colors={['rgba(245,208,111,0.03)', 'rgba(17,17,17,1)']}
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.snapshotLabel}>TOTAL BALANCE</Text>
        <AnimatedTextInput
          editable={false}
          animatedProps={animatedProps}
          style={styles.snapshotBalance}
        />
        <Text style={styles.snapshotChange}>+₹2,450 this month</Text>
        
        <View style={styles.snapshotDivider} />
        <Text style={styles.snapshotFooter}>3 cards • 24,500 reward points</Text>
      </PressableScale>
    </AnimatedReveal>
  );
}

function AuraHero({ scrollY, delayOffset }: { scrollY: SharedValue<number>, delayOffset: number }) {
  const router = useRouter();
  
  const iconScale = useSharedValue(1);
  const ringRot = useSharedValue(0);
  const glowOp = useSharedValue(0.025);

  useEffect(() => {
    iconScale.value = withRepeat(withSequence(withTiming(1.025, {duration: 2200}), withTiming(1, {duration: 2200})), -1, true);
    ringRot.value = withRepeat(withTiming(360, {duration: 9000, easing: Easing.linear}), -1, false);
    glowOp.value = withRepeat(withSequence(withTiming(0.06, {duration: 3000}), withTiming(0.025, {duration: 3000})), -1, true);
  }, []);

  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 300], [0, 15], Extrapolation.CLAMP) }]
  }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${ringRot.value}deg` }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  return (
    <AnimatedReveal delay={delayOffset}>
      <Animated.View style={parallaxStyle}>
        <View style={styles.airaCard}>
          {/* Ambient Glow */}
          <Animated.View style={[styles.airaGlow, glowStyle]} />
          
          <View style={styles.airaContent}>
            <Text style={styles.airaTitle}>AURA</Text>
            <Text style={styles.airaSub}>Your Personal Finance AI</Text>
            
            <Text style={styles.airaDesc}>
              Optimize your money{'\n'}intelligently.
            </Text>
            
            <AnimatedReveal delay={delayOffset + 400} translateY={8}>
              <PressableScale onPress={() => router.push('/aura')} style={styles.airaCta}>
                <Text style={styles.airaCtaText}>Ask Aura →</Text>
              </PressableScale>
            </AnimatedReveal>
          </View>
          
          <View style={styles.airaVisual}>
            <Animated.View style={[styles.airaRing, ringStyle]} />
            <Animated.View style={[styles.airaCenter, iconStyle]}>
              <Text style={styles.airaIcon}>✦</Text>
            </Animated.View>
          </View>
        </View>

        {/* Suggestion Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.airaPills}>
          {['Analyze spending', 'Optimize rewards', 'Find best card'].map((text, i) => (
            <AnimatedReveal key={i} delay={delayOffset + 200 + (i * 60)} translateY={10}>
              <PressableScale scaleTo={0.94} style={styles.airaPill}>
                <Text style={styles.airaPillIcon}>✦</Text>
                <Text style={styles.airaPillText}>{text}</Text>
              </PressableScale>
            </AnimatedReveal>
          ))}
        </ScrollView>
      </Animated.View>
    </AnimatedReveal>
  );
}

function RewardsOptimizer({ delayOffset }: { delayOffset: number }) {
  const router = useRouter();
  return (
    <AnimatedReveal delay={delayOffset}>
      <View style={styles.optimizerContainer}>
        <SectionTitle title="REWARDS OPTIMIZER" />
        <View style={styles.optimizerCard}>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Category</Text>
            <View style={styles.optValueBox}><Text style={styles.optValue}>Dining</Text></View>
          </View>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Amount</Text>
            <View style={styles.optValueBox}><Text style={styles.optValue}>₹5,000</Text></View>
          </View>
          <View style={styles.optDivider} />
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Best Card</Text>
            <Text style={styles.optResult}>HDFC Infinia</Text>
          </View>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Rewards</Text>
            <Text style={styles.optReward}>+₹165</Text>
          </View>
          <PressableScale style={styles.optCta} onPress={() => router.push('/wallet')}>
            <Text style={styles.optCtaText}>Optimize →</Text>
          </PressableScale>
        </View>
      </View>
    </AnimatedReveal>
  );
}

function QuickActionsGrid({ delayOffset }: { delayOffset: number }) {
  const actions = [
    { title: 'Add Money', icon: '＋' }, { title: 'Transfer', icon: '⇄' },
    { title: 'Pay', icon: '▣' }, { title: 'History', icon: '≡' }
  ];
  return (
    <AnimatedReveal delay={delayOffset}>
      <SectionTitle title="QUICK ACTIONS" />
      <View style={styles.quickGrid}>
        {actions.map((act, i) => (
          <AnimatedReveal key={i} delay={delayOffset + (i * 60)} translateY={15} style={styles.quickGridItem}>
            <PressableScale style={styles.quickCard} scaleTo={0.95}>
              <View style={styles.quickIconBox}><Text style={styles.quickIcon}>{act.icon}</Text></View>
              <Text style={styles.quickTitle}>{act.title}</Text>
            </PressableScale>
          </AnimatedReveal>
        ))}
      </View>
    </AnimatedReveal>
  );
}

function BestCardOpportunity({ delayOffset }: { delayOffset: number }) {
  const router = useRouter();
  return (
    <AnimatedReveal delay={delayOffset}>
      <SectionTitle title="YOUR BEST CARD OPPORTUNITY" />
      <PressableScale style={styles.bestCard} scaleTo={0.98}>
        <View style={styles.bestCardHeader}>
          <Text style={styles.bestCardLabel}>Smart card match</Text>
          <Text style={styles.bestCardTitle}>HDFC Infinia</Text>
        </View>
        <View style={styles.bestCardDivider} />
        <View style={styles.bestCardRow}>
          <View>
            <Text style={styles.bestCardSub}>Potential rewards:</Text>
            <Text style={styles.bestCardVal}>+₹12,000 / year</Text>
          </View>
          <PressableScale style={styles.bestCardCta} onPress={() => router.push('/wallet')}>
            <Text style={styles.bestCardCtaText}>Explore Card →</Text>
          </PressableScale>
        </View>
      </PressableScale>
    </AnimatedReveal>
  );
}

function RecentActivity({ delayOffset }: { delayOffset: number }) {
  return (
    <AnimatedReveal delay={delayOffset}>
      <SectionTitle title="RECENT ACTIVITY" />
      <View style={styles.activityContainer}>
        {MOCK_ACTIVITY.map((act, i) => (
          <AnimatedReveal key={act.id} delay={delayOffset + 100 + (i * 70)} translateY={0}>
            <PressableScale style={styles.activityRow}>
              <View style={styles.actLeft}>
                <Text style={styles.actTitle}>{act.type}</Text>
                <Text style={styles.actSub}>{act.time}</Text>
              </View>
              <Text style={styles.actAmount}>
                {act.amount < 0 ? '-' : '+'}₹{Math.abs(act.amount)}
              </Text>
            </PressableScale>
            {i !== MOCK_ACTIVITY.length - 1 && <View style={styles.actDivider} />}
          </AnimatedReveal>
        ))}
      </View>
    </AnimatedReveal>
  );
}

function RewardsCarousel({ delayOffset }: { delayOffset: number }) {
  return (
    <AnimatedReveal delay={delayOffset}>
      <SectionTitle title="YOUR REWARDS" style={{ paddingHorizontal: 20 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rewardsCarousel}>
        {MOCK_REWARDS.map((reward, i) => (
          <AnimatedReveal key={reward.id} delay={delayOffset + 100 + (i * 100)} translateY={0}>
            <PressableScale style={styles.rewardCard} scaleTo={0.97}>
              <LinearGradient
                colors={['rgba(245,208,111,0.05)', 'rgba(17,17,17,0)']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.rewardName}>{reward.name}</Text>
              <Text style={styles.rewardPoints}>{reward.points}</Text>
              <Text style={styles.rewardVal}>{reward.value}</Text>
            </PressableScale>
          </AnimatedReveal>
        ))}
      </ScrollView>
    </AnimatedReveal>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function PremiumHomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; }
  });

  return (
    <View style={styles.container}>
      {/* Ambient Atmosphere */}
      <View style={styles.ambientGrid} />
      
      <DynamicHeader scrollY={scrollY} delayOffset={50} />
      
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <FinancialSnapshot scrollY={scrollY} delayOffset={120} />
        
        <View style={styles.sectionGap} />
        <AuraHero scrollY={scrollY} delayOffset={220} />
        
        <View style={styles.sectionGap} />
        <RewardsOptimizer delayOffset={360} />
        
        <View style={styles.sectionGap} />
        <QuickActionsGrid delayOffset={480} />
        
        <View style={styles.sectionGap} />
        <BestCardOpportunity delayOffset={600} />
        
        <View style={styles.sectionGap} />
        <RecentActivity delayOffset={720} />
        
        <View style={styles.sectionGap} />
        {/* Carousel pulls padding internally to allow edge scrolling */}
        <View style={{ marginHorizontal: -20 }}>
          <RewardsCarousel delayOffset={840} />
        </View>
        
      </Animated.ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },
  ambientGrid: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.02,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(rgba(245, 208, 111, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 208, 111, 0.5) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionGap: {
    height: 28,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: '#6F6F6F',
    letterSpacing: 1,
    marginBottom: 12,
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070707',
    zIndex: 10,
  },
  headerGreeting: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#A0A0A0',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    color: '#F5D06F',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9412E',
  },

  // Financial Snapshot
  snapshotCard: {
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.12)',
    overflow: 'hidden',
  },
  snapshotLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#A0A0A0',
    letterSpacing: 1,
  },
  snapshotBalance: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: '700',
    color: '#F5F5F5',
    marginVertical: 4,
    padding: 0,
  },
  snapshotChange: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#54C78A',
  },
  snapshotDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 16,
    marginBottom: 12,
  },
  snapshotFooter: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#6F6F6F',
  },

  // Aira Hero
  airaCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  airaGlow: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F5D06F',
    shadowColor: '#F5D06F',
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 10,
  },
  airaContent: {
    flex: 1,
    zIndex: 2,
  },
  airaTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: '#F5D06F',
    letterSpacing: 2,
  },
  airaSub: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 4,
    marginBottom: 16,
  },
  airaDesc: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '500',
    color: '#F5F5F5',
    lineHeight: 24,
    marginBottom: 20,
  },
  airaCta: {
    alignSelf: 'flex-start',
  },
  airaCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#F5D06F',
  },
  airaVisual: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  airaRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.3)',
    borderStyle: 'dashed',
  },
  airaCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  airaIcon: {
    fontSize: 20,
    color: '#F5D06F',
  },
  airaPills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  airaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.12)',
  },
  airaPillIcon: {
    color: '#F5D06F',
    fontSize: 10,
    marginRight: 6,
  },
  airaPillText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#F5F5F5',
  },

  // Rewards Optimizer
  optimizerContainer: {},
  optimizerCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.1)',
  },
  optRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: '#A0A0A0',
  },
  optValueBox: {
    backgroundColor: '#171717',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optValue: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: '#F5F5F5',
  },
  optDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  optResult: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#F5D06F',
  },
  optReward: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#54C78A',
  },
  optCta: {
    backgroundColor: 'rgba(245,208,111,0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  optCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#F5D06F',
  },

  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickGridItem: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
  },
  quickCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,208,111,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickIcon: {
    color: '#F5D06F',
    fontSize: 16,
  },
  quickTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: '#F5F5F5',
  },

  // Best Card
  bestCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.14)',
  },
  bestCardHeader: {
    marginBottom: 16,
  },
  bestCardLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#A0A0A0',
  },
  bestCardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F5',
    marginTop: 4,
  },
  bestCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  bestCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bestCardSub: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#6F6F6F',
    marginBottom: 4,
  },
  bestCardVal: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#54C78A',
  },
  bestCardCta: {
    backgroundColor: '#171717',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.2)',
  },
  bestCardCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: '#F5D06F',
  },

  // Recent Activity
  activityContainer: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actLeft: {},
  actTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: '#F5F5F5',
  },
  actSub: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#6F6F6F',
    marginTop: 4,
  },
  actAmount: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    color: '#F5F5F5',
  },
  actDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Rewards Carousel
  rewardsCarousel: {
    paddingHorizontal: 20,
    gap: 12,
  },
  rewardCard: {
    width: 140,
    height: 100,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.1)',
    justifyContent: 'space-between',
  },
  rewardName: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#A0A0A0',
  },
  rewardPoints: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#F5D06F',
  },
  rewardVal: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#6F6F6F',
  },
});
