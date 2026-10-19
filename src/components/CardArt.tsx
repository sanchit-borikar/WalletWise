import React from 'react';
import { StyleSheet, View, Image } from 'react-native';

import { catalog } from '../data/catalog';
import { CardFace } from './CardFace';
import { CARD_IMAGES } from './cardImages';

/** Card artwork that fills its parent (absolute). Works for any catalog card. */
export function CardArt({ card, small }: { card: { catalogId: string }; small?: boolean }) {
  const image = CARD_IMAGES[card.catalogId];
  const data = catalog.byId.get(card.catalogId);

  return (
    <View style={styles.cardBase}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : (
        <CardFace issuer={data?.issuer ?? ''} name={data?.name ?? ''} network={data?.network} tier={data?.tier} small={small ?? true} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
