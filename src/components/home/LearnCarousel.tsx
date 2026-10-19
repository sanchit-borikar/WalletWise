import React, { useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { thumbnailUrl, VIDEOS, videoUrl } from '../../data/videos';
import type { Video } from '../../data/videos';
import { theme } from '../../theme';
import { Icon } from '../Icon';
import { SectionHeader } from './SectionHeader';

const LEVEL_COLOR: Record<Video['level'], string> = {
  Beginner: theme.colors.positive,
  Rewards: theme.colors.gold,
  Travel: theme.colors.textSecondary,
};

/** 16:9 video thumbnails. */
const THUMB_RATIO = 9 / 16;

const VideoCard = React.memo(function VideoCard({ video, width }: { video: Video; width: number }) {
  const open = () => WebBrowser.openBrowserAsync(videoUrl(video.id));
  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${video.title}, by ${video.channel}, ${video.length}. Opens YouTube.`}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    >
      <View style={[styles.thumbWrap, { height: width * THUMB_RATIO }]}>
        <Image source={{ uri: thumbnailUrl(video.id) }} style={styles.thumb} resizeMode="cover" />
        {/* Mutes bright thumbnails so the dark theme stays calm. */}
        <View style={styles.overlay} />
        <View style={styles.play}>
          <Icon name="play" color={theme.colors.gold} size={theme.sizes.icon} />
        </View>
        <View style={styles.length}>
          <Text style={[theme.text.caption, styles.lengthText]}>{video.length}</Text>
        </View>
      </View>
      <Text style={[theme.text.caption, styles.level, { color: LEVEL_COLOR[video.level] }]}>{video.level.toUpperCase()}</Text>
      <Text style={[theme.text.body, styles.title]} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={theme.text.caption} numberOfLines={1}>
        {video.channel}
      </Text>
    </Pressable>
  );
});

/** Expert videos. Cards snap, and the next card peeks in to show the row scrolls. */
export function LearnCarousel() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.round(screenWidth * theme.sizes.carouselCardRatio);
  const renderItem = useCallback(({ item }: { item: Video }) => <VideoCard video={item} width={cardWidth} />, [cardWidth]);

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader title="Learn from experts" meta={`${VIDEOS.length} videos`} />
      </View>
      <FlatList
        data={VIDEOS}
        horizontal
        keyExtractor={(v) => v.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + theme.spacing.md}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        initialNumToRender={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.md },
  content: { paddingHorizontal: theme.spacing.md, gap: theme.spacing.md },
  pressed: { opacity: 0.85 },
  thumbWrap: { borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.colors.surfaceRaised },
  thumb: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.colors.imageOverlay },
  play: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -theme.sizes.touch / 2,
    marginTop: -theme.sizes.touch / 2,
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.sizes.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
  },
  length: {
    position: 'absolute',
    right: theme.spacing.sm,
    bottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
  },
  lengthText: { color: theme.colors.textPrimary },
  level: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.textPrimary, fontWeight: '600', marginTop: theme.spacing.xs },
});
