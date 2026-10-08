import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  Easing,
  FadeIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';

// SCREEN_HEIGHT removed
const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;

export default function CreateCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const resolveOpacity = useSharedValue(0.1);
  const shimmerPosition = useSharedValue(-CARD_WIDTH * 1.5);

  useEffect(() => {
    // Card resolving into focus (opacity increasing slowly)
    resolveOpacity.value = withTiming(1, { duration: 2000, easing: Easing.in(Easing.cubic) });

    // Shimmer sweep effect
    shimmerPosition.value = withRepeat(
      withTiming(CARD_WIDTH * 1.5, { duration: 1500, easing: Easing.linear }),
      -1, // infinite
      false
    );

    // Transition to the card detail screen after ~2 seconds
    const timeout = setTimeout(() => {
      router.replace('/card-detail');
    }, 2200);

    return () => clearTimeout(timeout);
  }, [shimmerPosition, resolveOpacity, router]);

  const cardResolveStyle = useAnimatedStyle(() => {
    return {
      opacity: resolveOpacity.value,
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerPosition.value }]
    };
  });

  return (
    <View style={styles.container}>
      {/* Top Status Text */}
      <Animated.Text 
        entering={FadeIn.delay(200).duration(800)}
        style={[styles.statusText, { marginTop: insets.top + 40 }]}
      >
        Creating your card...
      </Animated.Text>

      {/* Center: Card Outline and Particle Shimmer */}
      <View style={styles.centerContainer}>
        <Animated.View entering={FadeIn.duration(1000)} style={[styles.cardOutline, cardResolveStyle]}>
          
          {/* Base card surface */}
          <LinearGradient
            colors={colors.card.surfaceGradient as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Sweeping Gold Shimmer Effect */}
          <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(245, 208, 111, 0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { width: CARD_WIDTH * 1.5, transform: [{ skewX: '-20deg' }] }]}
            />
          </Animated.View>

          {/* Sweeping Gold Highlight to complement shimmer */}
          <View style={styles.borderOverlay} />

        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOutline: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.2)',
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.3)',
    opacity: 0.5,
  }
});
