import { DOWNLOADED_CARD_IMAGES } from './cardImagesGenerated';

/**
 * Card artwork keyed by catalog card id. Hand-picked images come first, then images
 * collected from the banks' own card pages (assets/card-images, see manifest.json).
 * Cards without artwork use the generated CardFace, so all 280 cards look consistent.
 */
const HAND_PICKED: Record<string, number> = {
  'hdfc-infinia': require('../../cards picture/infinia-credit-card.png'),
  'sbi-bpcl-octane': require('../../cards picture/bpcl-octane-sbi-card.png'),
  'amex-platinum-travel': require('../../cards picture/platinumCarddec.png'),
  'hdfc-regalia-gold': require('../../cards picture/facie-regalia-gold.png'),
  'hdfc-marriott-bonvoy': require('../../cards picture/Card-Facia-Marriott-Bonvoy.png'),
  'hdfc-diners-black': require('../../travel/2. HDFC-Diners-Club-Black-Credit-Card.png'),
  'axis-atlas': require('../../travel/3. Axis Atlas.jpg'),
  'axis-magnus': require('../../travel/4. Axis-Magnus-Credit-Card-image.webp'),
  'hsbc-travelone': require('../../travel/5. HSBC-TravelOne-CC.webp'),
  'icici-emeralde-private': require('../../travel/7. ICICI-Bank-Emeralde-Private-Metal-Credit-Card.webp'),
  'sbi-elite': require('../../travel/10. elite-sbi-card.png'),
};

export const CARD_IMAGES: Record<string, number> = { ...DOWNLOADED_CARD_IMAGES, ...HAND_PICKED };
