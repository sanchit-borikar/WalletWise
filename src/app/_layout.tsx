import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Device from 'expo-device';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { WalletWiseIntro } from '../components/WalletWiseIntro';
import { isLowMemory, memoryGbLabel } from '../services/liteMode';
import { useCardStore } from '../store/useCardStore';

// Keep the native splash screen visible until our React hierarchy mounts
SplashScreen.preventAutoHideAsync();

/** True once the saved store (intro flag, lite mode) has loaded from AsyncStorage. */
function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(() => useCardStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useCardStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}

/** On a low-memory phone, offers Lite mode once. Either answer sets liteMode, so it is not asked again. */
function useLiteSuggestion(ready: boolean) {
  const liteChosen = useCardStore((s) => s.liteMode !== undefined);
  const setLiteMode = useCardStore((s) => s.setLiteMode);
  useEffect(() => {
    if (!ready || liteChosen || !isLowMemory(Device.totalMemory)) return;
    Alert.alert(
      'Turn on Lite mode?',
      `This phone has about ${memoryGbLabel(Device.totalMemory ?? 0)} GB of memory. Lite mode makes WalletWise faster: no blur or video, fewer animations, and Best Card opens as a list. You can change it in Settings.`,
      [
        { text: 'Not now', style: 'cancel', onPress: () => setLiteMode(false) },
        { text: 'Turn on', onPress: () => setLiteMode(true) },
      ],
      { cancelable: false },
    );
  }, [ready, liteChosen, setLiteMode]);
}

export default function RootLayout() {
  const hydrated = useStoreHydrated();
  const introSeen = useCardStore((s) => s.introSeen === true);
  const liteMode = useCardStore((s) => s.liteMode === true);
  const setIntroSeen = useCardStore((s) => s.setIntroSeen);

  // The intro plays once, on first launch, and never in lite mode.
  const showIntro = hydrated && !introSeen && !liteMode;

  useEffect(() => {
    if (hydrated && !showIntro) SplashScreen.hideAsync();
  }, [hydrated, showIntro]);
  useLiteSuggestion(hydrated && !showIntro);

  // Splash stays up until the saved settings are known.
  if (!hydrated) return null;

  if (showIntro) {
    return <WalletWiseIntro onFinish={setIntroSeen} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Lite mode turns Reanimated animations into instant changes. */}
      <ReducedMotionConfig mode={liteMode ? ReduceMotion.Always : ReduceMotion.System} />
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="card-detail" options={{ headerShown: false, gestureEnabled: true, gestureDirection: 'horizontal' }} />
        <Stack.Screen name="create-card" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="add-card" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="find-card" options={{ headerShown: false }} />
        <Stack.Screen name="trip-planner" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
