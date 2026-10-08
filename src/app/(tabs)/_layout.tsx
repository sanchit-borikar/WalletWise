import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  useSharedValue,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { colors, typography } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabItem({ route, isFocused, options, onPress }: any) {
  const label = options.title !== undefined ? options.title : route.name;
  
  // Animation values
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withSpring(isFocused ? 1 : 0, { 
      damping: 18, 
      stiffness: 150 
    });
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(activeProgress.value, [0, 1], [1, 1.12], Extrapolation.CLAMP) }],
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: activeProgress.value,
      transform: [{ scaleX: interpolate(activeProgress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      opacity: activeProgress.value,
      transform: [{ translateY: interpolate(activeProgress.value, [0, 1], [4, 0], Extrapolation.CLAMP) }],
    };
  });

  // Dummy icons for now
  const iconChar = route.name === 'index' ? '⌂' : 
                   route.name === 'map' ? '⚲' : 
                   route.name === 'learn' ? 'Ꙭ' : '💳';

  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <Animated.View style={iconStyle}>
        <Text style={[styles.tabIcon, isFocused && styles.activeText]}>
          {iconChar}
        </Text>
      </Animated.View>
      
      {/* Active Indicator Line */}
      <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
      
      {/* Label */}
      <Animated.View style={[styles.labelContainer, labelStyle]}>
        <Text style={[styles.tabLabel, isFocused && styles.activeText]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CenterAuraButton({ onPress, isFocused }: any) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    shadowRadius: isFocused ? 16 : 8,
    shadowOpacity: isFocused ? 0.6 : 0.3,
  }));

  return (
    <View style={styles.centerTabWrapper}>
      <AnimatedPressable
        onPressIn={() => (pressScale.value = withSpring(0.92))}
        onPressOut={() => (pressScale.value = withSpring(1))}
        onPress={onPress}
        style={[styles.centerButtonWrapper, animatedStyle]}
      >
        <LinearGradient
          colors={['#171717', '#0A0A0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButton}
        >
          <Text style={styles.centerIcon}>✦</Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={50} tint="dark" style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom - 10 : 16 }]}>
        <View style={styles.topBorder} />
        
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const isCenter = route.name === 'aura';

          if (isCenter) {
            return <CenterAuraButton key={route.key} onPress={onPress} isFocused={isFocused} />;
          }

          return (
            <TabItem 
              key={route.key} 
              route={route} 
              isFocused={isFocused} 
              options={options} 
              onPress={onPress} 
            />
          );
        })}
      </BlurView>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Best Card' }} />
      <Tabs.Screen name="aura" options={{ title: 'Aura' }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    height: 74,
    backgroundColor: 'rgba(7, 7, 7, 0.85)',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(245, 208, 111, 0.10)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  tabIcon: {
    fontSize: 20,
    color: '#6F6F6F',
    marginBottom: 2,
  },
  activeText: {
    color: '#F5D06F',
  },
  activeIndicator: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F5D06F',
    marginVertical: 4,
    shadowColor: '#F5D06F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -16, // Hidden initially, will animate up
  },
  tabLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: '#6F6F6F',
    fontWeight: '600',
  },
  
  // Center Button
  centerTabWrapper: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerButtonWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -16,
    padding: 2, // for the gold border effect
    backgroundColor: 'rgba(245, 208, 111, 0.3)', // subtle gold ring
    shadowColor: '#F5D06F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  centerButton: {
    flex: 1,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  centerIcon: {
    fontSize: 24,
    color: '#F5D06F',
  },
});
