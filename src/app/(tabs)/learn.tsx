import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Pressable, ScrollView, 
  useWindowDimensions, TextInput, Image
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, Easing, interpolate,
  Extrapolation, useAnimatedScrollHandler
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { colors, typography } from '../../theme';
import { useCardStore } from '../../store/useCardStore';
import { CardArt } from '../../components/CardArt';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ==========================================
// 1. REUSABLE ANIMATED COMPONENTS
// ==========================================
const AnimatedCard = ({ children, style, onPress }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));
  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 20, stiffness: 180 }))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

// ==========================================
// 2. ROBUST VIDEO THUMBNAIL
// ==========================================
const FeaturedVideo = () => {
  const videoId = 'M4SMio3nUKs';
  const [thumbState, setThumbState] = useState<'loading' | 'maxres' | 'hq' | 'fallback'>('loading');
  const glow = useSharedValue(0.2);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );
  }, []);
  
  const playStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0.2, 0.6], [1, 1.03]) }]
  }));

  const handleImageError = () => {
    if (thumbState === 'loading' || thumbState === 'maxres') setThumbState('hq');
    else if (thumbState === 'hq') setThumbState('fallback');
  };

  const getSource = () => {
    if (thumbState === 'maxres' || thumbState === 'loading') return { uri: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` };
    if (thumbState === 'hq') return { uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` };
    return require('../../../assets/images/icon.png'); // Fallback local image
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>FEATURED FOR YOU</Text>
      <AnimatedCard 
        style={styles.videoCard}
        onPress={async () => {
          try {
            await WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${videoId}`);
          } catch (e) {
            console.error('Browser failed to open', e);
          }
        }}
      >
        <View style={styles.videoThumbnail}>
          {thumbState === 'fallback' ? (
            <LinearGradient colors={['#171717', '#0A0A0A']} style={StyleSheet.absoluteFill} />
          ) : (
            <Image 
              source={getSource()}
              style={StyleSheet.absoluteFill}
              onLoad={() => { if (thumbState === 'loading') setThumbState('maxres'); }}
              onError={handleImageError}
              resizeMode="cover"
            />
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(7,7,7,0.9)']}
            style={styles.videoOverlay}
          />
          <Animated.View style={[styles.playButtonWrapper, playStyle]}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </Animated.View>
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>12:24</Text>
          </View>
        </View>
        <View style={styles.videoMeta}>
          <Text style={styles.videoTitle}>How Credit Card Rewards Work</Text>
          <Text style={styles.videoSub}>WalletWise Official • Beginner</Text>
        </View>
      </AnimatedCard>
    </View>
  );
};

// ==========================================
// 3. EXPLORE TOPICS
// ==========================================
const TOPICS = ['Travel', 'Dining', 'Grocery', 'Electronics', 'Shopping', 'Pharmacy/Health', 'Entertainment', 'Business'];
const ExploreTopics = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>EXPLORE TOPICS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsScroll}>
        {TOPICS.map(topic => {
          return (
            <Pressable 
              key={topic} 
              onPress={() => router.push({ pathname: '/topic/[id]', params: { id: topic.toLowerCase() } })} 
              style={styles.topicPill}
            >
              <Text style={styles.topicText}>{topic}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ==========================================
// 4. LEARN WITH YOUR CARDS (WITH REAL CARD ART)
// ==========================================
const LearnWithCards = () => {
  const { cards } = useCardStore();
  const { width } = useWindowDimensions();
  
  if (!cards || cards.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>LEARN WITH YOUR CARDS</Text>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary, textTransform: 'none', fontSize: 13, marginTop: -12, marginBottom: 16, fontWeight: '400' }]}>Understand how YOUR cards actually work.</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        snapToInterval={width * 0.75 + 16}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
      >
        {cards.map(c => (
          <AnimatedCard 
            key={c.id} 
            style={[styles.learnCard, { width: width * 0.75 }]}
            onPress={() => router.push(`/card-detail?id=${c.id}`)}
          >
            <View style={styles.learnCardArtworkWrapper}>
              {/* REAL CARD ART INSTEAD OF PLACEHOLDER */}
              <View style={{ width: 140, height: 90, transform: [{ rotate: '5deg' }, { translateX: 20 }] }}>
                 <CardArt card={c} />
              </View>
            </View>
            <View style={styles.learnCardContent}>
              <Text style={styles.learnCardBank}>{c.bankName}</Text>
              <Text style={styles.learnCardName}>{c.cardName}</Text>
              <Text style={styles.learnCardDesc}>Master {c.cardName} rewards and optimizations.</Text>
              <Text style={styles.learnCardLink}>Learn Optimization →</Text>
            </View>
          </AnimatedCard>
        ))}
      </ScrollView>
    </View>
  );
};

// ==========================================
// 5. INTERACTIVE POINTS CALCULATOR
// ==========================================
const PointsCalculator = () => {
  const { cards } = useCardStore();
  const [spend, setSpend] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(cards?.[0]?.id || null);

  // Simple simulated reward rates for demonstration
  const getRewardRate = (cardName: string) => {
    if (cardName.includes('Infinia')) return 0.033; // 3.3%
    if (cardName.includes('Octane')) return 0.025; // 2.5%
    if (cardName.includes('Travel')) return 0.02; // 2.0%
    return 0.015; // 1.5% default
  };

  const selectedCard = cards?.find(c => c.id === selectedCardId);
  const rate = selectedCard ? getRewardRate(selectedCard.cardName) : 0.033;
  const points = spend ? Math.floor(Number(spend) * rate) : 0; 
  
  return (
    <View style={[styles.toolCard, { width: '100%', marginBottom: 16 }]}>
      <Text style={styles.toolIcon}>⨢</Text>
      <Text style={styles.toolTitle}>Points Calculator</Text>
      <Text style={styles.toolSub}>Calculate what your spending could earn.</Text>
      
      <View style={styles.calcRow}>
        <Text style={styles.calcCurrency}>₹</Text>
        <TextInput 
          style={styles.calcInput}
          placeholder="10000"
          placeholderTextColor="#6F6F6F"
          keyboardType="numeric"
          value={spend}
          onChangeText={setSpend}
        />
      </View>

      {cards && cards.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: colors.text.secondary, marginBottom: 8 }}>Select Card:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {cards.map(c => {
              const isSelected = c.id === selectedCardId;
              return (
                <Pressable 
                  key={c.id} 
                  onPress={() => setSelectedCardId(c.id)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, 
                    borderRadius: 8, borderWidth: 1, 
                    borderColor: isSelected ? colors.accent.goldStart : '#333',
                    backgroundColor: isSelected ? 'rgba(245, 208, 111, 0.1)' : '#111'
                  }}
                >
                  <Text style={{ 
                    color: isSelected ? colors.accent.goldStart : colors.text.secondary, 
                    fontSize: 12, fontWeight: isSelected ? '600' : '400' 
                  }}>
                    {c.cardName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.calcResultBox}>
        <View>
          <Text style={styles.calcResultText}>Estimated Yield:</Text>
          <Text style={{ color: colors.text.secondary, fontSize: 11, marginTop: 2 }}>
            Using {selectedCard?.cardName || 'Default'} ({(rate * 100).toFixed(1)}%)
          </Text>
        </View>
        <Text style={styles.calcResultValue}>{points} pts</Text>
      </View>
    </View>
  );
};

// ==========================================
// 6. INTERACTIVE QUIZ
// ==========================================
const QUIZ_BANK = [
  {
    question: "You are spending ₹5,000 on fuel. Which card?",
    options: ["HDFC Infinia", "SBI BPCL Octane"],
    correctIdx: 1,
    rationale: "Octane yields 7.25% on BPCL fuel, whereas Infinia yields 0% on fuel purchases."
  },
  {
    question: "Which card offers unlimited international lounge access?",
    options: ["Regalia Gold", "HDFC Infinia"],
    correctIdx: 1,
    rationale: "Infinia provides unlimited Priority Pass lounge visits globally for both primary and add-on members."
  },
  {
    question: "Which card gives a massive milestone bonus at ₹4 Lakhs spend?",
    options: ["Amex Platinum Travel", "SBI BPCL Octane"],
    correctIdx: 0,
    rationale: "Amex Platinum Travel awards 10,000 bonus Membership Rewards and a Taj voucher on hitting ₹4 Lakhs."
  },
  {
    question: "Which card's points give the highest value for Marriott Bonvoy transfers?",
    options: ["HDFC Diners Club Black", "Marriott Bonvoy HDFC"],
    correctIdx: 1,
    rationale: "The Marriott Bonvoy card earns Bonvoy points directly, often yielding better hotel value than standard conversion rates."
  }
];

const CardQuiz = () => {
  const [answered, setAnswered] = useState(false);
  const [quizItem, setQuizItem] = useState(QUIZ_BANK[0]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const ringScale = useSharedValue(0);

  useEffect(() => {
    // Pick a random quiz question on mount
    const randomIdx = Math.floor(Math.random() * QUIZ_BANK.length);
    setQuizItem(QUIZ_BANK[randomIdx]);
  }, []);
  
  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    ringScale.value = withSpring(1);
  };

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: interpolate(ringScale.value, [0, 1], [0, 1])
  }));

  const isCorrect = selectedIdx === quizItem.correctIdx;

  return (
    <View style={[styles.toolCard, { width: '100%', marginBottom: 16 }]}>
      <Text style={styles.toolIcon}>?</Text>
      <Text style={styles.toolTitle}>Card Quiz</Text>
      <Text style={styles.toolSub}>{quizItem.question}</Text>
      
      {!answered ? (
        <View style={styles.quizOptions}>
          {quizItem.options.map((opt, i) => (
             <Pressable key={i} style={styles.quizBtn} onPress={() => handleAnswer(i)}>
               <Text style={styles.quizBtnText}>{opt}</Text>
             </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.quizResult, { borderColor: isCorrect ? 'rgba(84, 199, 138, 0.2)' : 'rgba(201, 65, 46, 0.2)', backgroundColor: isCorrect ? 'rgba(84, 199, 138, 0.05)' : 'rgba(201, 65, 46, 0.05)' }]}>
          <Animated.View style={[styles.quizRing, ringStyle, { backgroundColor: isCorrect ? '#54C78A' : colors.accent.danger }]}>
            <Text style={styles.quizResultIcon}>{isCorrect ? '✓' : '✗'}</Text>
          </Animated.View>
          <View style={{ flex: 1, marginLeft: 16 }}>
             <Text style={[styles.quizResultTitle, { color: isCorrect ? '#54C78A' : colors.accent.danger }]}>
               {isCorrect ? `${quizItem.options[quizItem.correctIdx]} is correct!` : `Incorrect.`}
             </Text>
             <Text style={styles.quizResultDesc}>{quizItem.rationale}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const InteractiveTools = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>INTERACTIVE TOOLS</Text>
      <View style={{ paddingHorizontal: 24 }}>
        <PointsCalculator />
        <CardQuiz />
      </View>
    </View>
  );
};

// ==========================================
// 7. MYTH VS FACT (3D FLIP)
// ==========================================
const MYTH_BANK = [
  {
    myth: '"Having multiple credit cards hurts your CIBIL score."',
    fact: 'More cards increase your total credit limit, which lowers your utilization ratio, actually boosting your score.'
  },
  {
    myth: '"Paying only the Minimum Amount Due protects your credit score without extra costs."',
    fact: 'You avoid late fees, but you will be charged massive interest (3-4% monthly) on the remaining balance. Always pay in full.'
  },
  {
    myth: '"Closing an old, unused credit card will improve your credit score."',
    fact: 'Closing an old card reduces your average credit age and total available credit limit, which can actually drop your CIBIL score.'
  },
  {
    myth: '"Withdrawing cash from an ATM using a credit card is the same as a debit card."',
    fact: 'Credit card cash advances incur a hefty immediate withdrawal fee and high interest charges from day one, with no grace period.'
  }
];

const MythVsFact = () => {
  const [flipped, setFlipped] = useState(false);
  const [content, setContent] = useState(MYTH_BANK[0]);
  const flipVal = useSharedValue(0);

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * MYTH_BANK.length);
    setContent(MYTH_BANK[randomIdx]);
  }, []);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipVal.value, [0, 1], [0, 90])}deg` }],
    opacity: interpolate(flipVal.value, [0, 0.5], [1, 0])
  }));
  
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipVal.value, [0, 1], [-90, 0])}deg` }],
    opacity: interpolate(flipVal.value, [0.5, 1], [0, 1]),
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0
  }));

  const handlePress = () => {
    flipVal.value = withSpring(flipped ? 0 : 1, { damping: 15, stiffness: 120 });
    setFlipped(!flipped);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>MYTH VS FACT</Text>
      <Pressable onPress={handlePress} style={styles.flipContainer}>
        <Animated.View style={[styles.flipCard, frontStyle]}>
          <Text style={styles.flipBadge}>MYTH</Text>
          <Text style={styles.flipText}>{content.myth}</Text>
          <Text style={styles.flipHint}>Tap to reveal fact</Text>
        </Animated.View>
        <Animated.View style={[styles.flipCard, styles.flipCardBack, backStyle]}>
          <Text style={[styles.flipBadge, { color: '#54C78A' }]}>FACT</Text>
          <Text style={styles.flipText}>{content.fact}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

// ==========================================
// 8. ACADEMY TIMELINE
// ==========================================
const Academy = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CREDIT CARD ACADEMY</Text>
      <View style={styles.academyBox}>
        {[
          { title: "FOUNDATIONS", sub: "Understanding your card", status: "done" },
          { title: "REWARDS", sub: "Earn more from spending", status: "active" },
          { title: "OPTIMIZATION", sub: "Choose the right card", status: "locked" },
          { title: "ADVANCED", sub: "Master redemption", status: "locked" }
        ].map((node, i) => (
          <View key={i} style={styles.academyNode}>
            <View style={styles.nodeLine}>
              <View style={[
                styles.nodeDot, 
                node.status === 'done' && styles.nodeDotDone,
                node.status === 'active' && styles.nodeDotActive
              ]}>
                {node.status === 'done' && <Text style={styles.checkIcon}>✓</Text>}
              </View>
              {i < 3 && <View style={[styles.nodePath, node.status === 'done' && styles.nodePathDone]} />}
            </View>
            <View style={styles.nodeContent}>
              <Text style={[styles.nodeTitle, node.status === 'locked' && styles.textMuted]}>0{i+1} {node.title}</Text>
              <Text style={styles.nodeSub}>{node.sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ==========================================
// MAIN SCREEN COMPONENT
// ==========================================
export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; }
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.9]),
    transform: [{ scale: interpolate(scrollY.value, [0, 100], [1, 0.98], Extrapolation.CLAMP) }]
  }));

  return (
    <View style={styles.container}>
      {/* Ambient Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['rgba(245, 208, 111, 0.03)', 'transparent']} style={{ height: 400 }} />
      </View>

      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <Text style={styles.headerLabel}>LEARN</Text>
          <Text style={styles.headerTitle}>Master Your{'\n'}Credit Cards</Text>
          <Text style={styles.headerSub}>Learn smarter.{'\n'}Optimize every swipe.</Text>
          
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⚲</Text>
            <TextInput 
              placeholder="Search lessons, videos, tools..."
              placeholderTextColor="#6F6F6F"
              style={styles.searchInput}
            />
          </View>
        </Animated.View>

        {/* Continue Learning */}
        <View style={[styles.section, { paddingHorizontal: 24 }]}>
          <Text style={styles.sectionTitle}>YOUR NEXT LESSON</Text>
          <AnimatedCard style={styles.continueCard}>
            <Text style={styles.continueTitle}>How to Maximize Reward Points</Text>
            <Text style={styles.continueSub}>Understand how reward points work.</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '68%' }]} />
              </View>
              <Text style={styles.progressText}>68%</Text>
            </View>
            <Text style={styles.continueLink}>Continue →</Text>
          </AnimatedCard>
        </View>

        <FeaturedVideo />
        <ExploreTopics />
        <LearnWithCards />
        <InteractiveTools />
        <Academy />
        <MythVsFact />

      </Animated.ScrollView>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 24, marginBottom: 32 },
  headerLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.accent.goldStart, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  headerTitle: { fontFamily: typography.fontFamily, fontSize: 36, color: colors.text.primary, fontWeight: '600', letterSpacing: -1, lineHeight: 40 },
  headerSub: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.text.secondary, marginTop: 12, lineHeight: 22 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, height: 48, marginTop: 24, borderWidth: 1, borderColor: '#333' },
  searchIcon: { fontSize: 20, color: '#6F6F6F', marginRight: 8, transform: [{rotate: '-45deg'}] },
  searchInput: { flex: 1, color: colors.text.primary, fontFamily: typography.fontFamily, fontSize: 16 },
  
  section: { marginBottom: 40 },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: 11, color: '#6F6F6F', fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: 24, marginBottom: 16 },
  
  continueCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(245, 208, 111, 0.15)' },
  continueTitle: { fontFamily: typography.fontFamily, fontSize: 18, color: colors.text.primary, fontWeight: '600' },
  continueSub: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.text.secondary, marginTop: 4, marginBottom: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent.goldStart, borderRadius: 3 },
  progressText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.accent.goldStart, fontWeight: '700' },
  continueLink: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.accent.goldStart, fontWeight: '600' },

  videoCard: { marginHorizontal: 24, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  videoThumbnail: { height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  videoOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', padding: 12 },
  playButtonWrapper: { position: 'absolute', zIndex: 10 },
  playButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(7,7,7,0.7)', borderWidth: 1, borderColor: 'rgba(245, 208, 111, 0.4)', justifyContent: 'center', alignItems: 'center' },
  playIcon: { color: colors.accent.goldStart, fontSize: 20, marginLeft: 4 },
  videoBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  videoBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600', fontFamily: typography.fontFamily },
  videoMeta: { padding: 16 },
  videoTitle: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.text.primary, fontWeight: '600', marginBottom: 4 },
  videoSub: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.text.secondary },

  topicsScroll: { paddingHorizontal: 24, gap: 12 },
  topicPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#333' },
  topicPillActive: { backgroundColor: colors.accent.goldStart, borderColor: colors.accent.goldStart },
  topicText: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  topicTextActive: { color: '#000', fontWeight: '700' },

  learnCard: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  learnCardArtworkWrapper: { height: 130, padding: 16, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  learnCardBank: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.text.secondary, textTransform: 'uppercase', marginBottom: 4 },
  learnCardName: { fontFamily: typography.fontFamily, fontSize: 18, color: '#FFF', fontWeight: '600' },
  learnCardContent: { padding: 16 },
  learnCardDesc: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.text.secondary, marginBottom: 16, marginTop: 4 },
  learnCardLink: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.accent.goldStart, fontWeight: '600' },

  toolCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  toolIcon: { fontSize: 24, color: colors.accent.goldStart, marginBottom: 12 },
  toolTitle: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.text.primary, fontWeight: '600', marginBottom: 4 },
  toolSub: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.text.secondary, lineHeight: 20, marginBottom: 16 },
  
  calcRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#222' },
  calcCurrency: { color: colors.text.secondary, fontSize: 18, marginRight: 8 },
  calcInput: { flex: 1, color: colors.text.primary, fontSize: 18, fontWeight: '600' },
  calcResultBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: 16, backgroundColor: 'rgba(245, 208, 111, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 208, 111, 0.15)' },
  calcResultText: { color: colors.accent.goldStart, fontSize: 14, fontWeight: '600' },
  calcResultValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  quizOptions: { gap: 12 },
  quizBtn: { backgroundColor: '#000', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  quizBtnText: { color: colors.text.primary, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  quizResult: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, backgroundColor: 'rgba(84, 199, 138, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(84, 199, 138, 0.2)' },
  quizRing: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#54C78A', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  quizResultIcon: { color: '#000', fontSize: 16, fontWeight: '800' },
  quizResultTitle: { color: '#54C78A', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  quizResultDesc: { color: colors.text.secondary, fontSize: 13, lineHeight: 18 },

  flipContainer: { paddingHorizontal: 24, height: 160 },
  flipCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#333', backfaceVisibility: 'hidden', justifyContent: 'center' },
  flipCardBack: { backgroundColor: '#141414', borderColor: 'rgba(245, 208, 111, 0.3)' },
  flipBadge: { fontFamily: typography.fontFamily, fontSize: 11, color: '#6F6F6F', fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  flipText: { fontFamily: typography.fontFamily, fontSize: 18, color: colors.text.primary, fontWeight: '500', lineHeight: 26 },
  flipHint: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.accent.goldStart, marginTop: 16, fontWeight: '600' },

  academyBox: { marginHorizontal: 24, backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#333' },
  academyNode: { flexDirection: 'row', gap: 16 },
  nodeLine: { alignItems: 'center', width: 24 },
  nodeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#222', borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  nodeDotDone: { backgroundColor: 'rgba(245, 208, 111, 0.1)', borderColor: colors.accent.goldStart },
  nodeDotActive: { backgroundColor: colors.surface, borderColor: colors.accent.goldStart, shadowColor: colors.accent.goldStart, shadowOpacity: 0.5, shadowRadius: 8 },
  checkIcon: { fontSize: 12, color: colors.accent.goldStart, fontWeight: '900' },
  nodePath: { width: 2, height: 40, backgroundColor: '#333', marginVertical: 4 },
  nodePathDone: { backgroundColor: colors.accent.goldStart },
  nodeContent: { flex: 1, paddingBottom: 24, marginTop: 2 },
  nodeTitle: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.text.primary, fontWeight: '600' },
  nodeSub: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.text.secondary, marginTop: 4 },
  textMuted: { color: '#6F6F6F' }
});
