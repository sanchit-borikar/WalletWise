import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

interface WalletWiseIntroProps {
  onFinish: () => void;
}

export function WalletWiseIntro({ onFinish }: WalletWiseIntroProps) {
  const player = useVideoPlayer(require('../../assets/intro.mp4'), (player) => {
    player.play();
  });

  useEffect(() => {
    // If the video hangs or errors, this will ensure the app still opens
    let safetyTimeout = setTimeout(() => {
      console.log('Intro safety timeout triggered (15s fallback)');
      SplashScreen.hideAsync();
      onFinish();
    }, 15000);

    return () => clearTimeout(safetyTimeout);
  }, [onFinish]);

  useEventListener(player, 'statusChange', (payload) => {
    if (payload.status === 'error') {
      console.log('Video Player Error:', payload.error);
      SplashScreen.hideAsync();
      onFinish();
    }
  });

  // Ensure the splash screen only hides when the very first frame of the video paints
  useEventListener(player, 'timeUpdate', (payload) => {
    if (payload.currentTime > 0.05) {
      SplashScreen.hideAsync();
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!isPlaying && player.currentTime > 0.5) {
      console.log('Video finished cleanly (playingChange)');
      onFinish();
    }
  });

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="cover"
      />
      <Pressable
        onPress={() => {
          player.pause();
          SplashScreen.hideAsync();
          onFinish();
        }}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
        hitSlop={12}
        style={styles.skip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  skip: {
    position: 'absolute',
    top: 56,
    right: 20,
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(245,208,111,0.6)',
  },
  skipText: { color: '#F5D06F', fontSize: 15, fontWeight: '700' },
});
