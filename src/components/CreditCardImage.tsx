import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { CardData } from '../store/useCardStore';

type Props = {
  card: CardData;
  style?: any;
};

export function CreditCardImage({ card, style }: Props) {
  let imageSource;

  switch (card.cardName) {
    case 'Infinia':
      imageSource = require('../../cards picture/infinia-credit-card.png');
      break;
    case 'BPCL Octane':
      imageSource = require('../../cards picture/bpcl-octane-sbi-card.png');
      break;
    case 'Platinum Travel':
      imageSource = require('../../cards picture/platinumCarddec.png');
      break;
    case 'Regalia Gold':
      imageSource = require('../../cards picture/facie-regalia-gold.png');
      break;
    case 'Marriott Bonvoy':
      imageSource = require('../../cards picture/Card-Facia-Marriott-Bonvoy.png');
      break;
    default:
      imageSource = require('../../cards picture/infinia-credit-card.png');
      break;
  }

  return (
    <Animated.View 
      sharedTransitionTag={`card-image-${card.id}`} 
      style={[styles.container, style]}
    >
      <Image 
        source={imageSource} 
        style={styles.image} 
        contentFit="fill"
        transition={200}
        cachePolicy="memory-disk"
      />
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
