import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import { catalog } from '../data/catalog';
import { CardFace } from './CardFace';
import { CARD_IMAGES } from './cardImages';

type Props = {
  card: { id: string; catalogId: string };
  style?: any;
};

/** Full-size card artwork (1.586 aspect ratio). Any catalog card without artwork gets a generated face. */
export function CreditCardImage({ card, style }: Props) {
  const imageSource = CARD_IMAGES[card.catalogId];
  const data = catalog.byId.get(card.catalogId);

  return (
    <Animated.View sharedTransitionTag={`card-image-${card.id}`} style={[styles.container, style]}>
      {imageSource ? (
        <Image source={imageSource} style={styles.image} contentFit="fill" transition={200} cachePolicy="memory-disk" />
      ) : (
        <CardFace issuer={data?.issuer ?? ''} name={data?.name ?? ''} network={data?.network} tier={data?.tier} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.586,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
