import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
// unused imports removed
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { WalletWiseIntro } from '../components/WalletWiseIntro';

// Keep the native splash screen visible until our React hierarchy mounts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isIntroFinished, setIsIntroFinished] = useState(false);

  useEffect(() => {
    // We will hide the splash screen inside WalletWiseIntro once the video is ready
  }, []);

  const handleIntroFinish = () => {
    setIsIntroFinished(true);
  };

  // If intro hasn't been finished/seen, return ONLY the intro component
  // This explicitly blocks the Stack (and Home screen) from rendering/mounting
  if (!isIntroFinished) {
    return <WalletWiseIntro onFinish={handleIntroFinish} />;
  }

  // Once finished, mount the actual application routing
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="card-detail" options={{ headerShown: false, gestureEnabled: true, gestureDirection: 'horizontal' }} />
        <Stack.Screen name="create-card" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
