import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
// unused import removed
import { CardData } from '../store/useCardStore';

export function CardArt({ card }: { card: CardData }) {
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
    case 'Diners Club Black':
      imageSource = require('../../cards picture/infinia-credit-card.png'); // Fallback if no specific DCB image exists
      break;
    case 'Regalia Gold':
      imageSource = require('../../cards picture/facie-regalia-gold.png');
      break;
    case 'Marriott Bonvoy':
      imageSource = require('../../cards picture/Card-Facia-Marriott-Bonvoy.png');
      break;
    default:
      // Fallback if needed
      imageSource = require('../../cards picture/infinia-credit-card.png');
      break;
  }

  return (
    <View style={styles.cardBase}>
      <Image 
        source={imageSource} 
        style={styles.image} 
        resizeMode="contain" 
      />
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
    backgroundColor: '#000', // Dark background for transparent images if any
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
