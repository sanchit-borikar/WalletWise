import { Platform, StyleSheet } from 'react-native';

/**
 * Design tokens for WalletWise: dark background, gold accents.
 * Every text colour below meets WCAG AA (4.5:1) on `background` and `surface`.
 * Contrast on #0A0A0A: textPrimary 18:1, textSecondary 10.5:1, textMuted 6.5:1,
 * gold 13:1, positive 10.6:1, danger 7.1:1, warning 10.9:1 (textMuted on surfaceRaised 5.6:1).
 */
const colors = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceRaised: '#1C1C1C',
  border: '#262626',
  borderStrong: '#3A3A3A',

  textPrimary: '#F5F5F5',
  textSecondary: '#BDBDBD',
  textMuted: '#949494',

  gold: '#F5D06F',
  goldSoft: 'rgba(245, 208, 111, 0.12)',
  goldBorder: 'rgba(245, 208, 111, 0.4)',
  onGold: '#0A0A0A',

  positive: '#5FD394',
  danger: '#FF6B5A',
  dangerSoft: 'rgba(255, 107, 90, 0.12)',
  warning: '#F2B54A',
  warningSoft: 'rgba(242, 181, 74, 0.12)',
  info: '#BDBDBD',
  infoSoft: 'rgba(255, 255, 255, 0.06)',

  pressed: 'rgba(255, 255, 255, 0.06)',
  tabBar: 'rgba(10, 10, 10, 0.92)',
  /** Dims bright video thumbnails so text and the dark theme stay dominant. */
  imageOverlay: 'rgba(10, 10, 10, 0.4)',
  /** Subtle gold wash behind the hero card. */
  heroGradient: ['rgba(245, 208, 111, 0.07)', 'rgba(20, 20, 20, 0)'] as const,
} as const;

/** One spacing scale. Sections are separated by `lg`. */
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

const sizes = {
  /** Minimum touch target (Apple HIG 44pt, Material 48dp). */
  touch: 44,
  icon: 20,
  iconLarge: 24,
  badge: 40,
  badgeSmall: 28,
  tabBarHeight: 64,
  auraButton: 56,
  /** Learn carousel card width as a share of the screen, so the next card peeks in. */
  carouselCardRatio: 0.72,
  dot: 8,
  /** Active tab underline and the Aura button's gold ring. */
  accentLine: 2,
  hairline: StyleSheet.hairlineWidth,
} as const;

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

const fontSize = {
  caption: 12,
  body: 15,
  title: 20,
  /** Large numbers only (hero value). Uses the title style at a bigger size. */
  hero: 34,
} as const;

/** The three text styles used across Home: title, body and caption. */
const text = StyleSheet.create({
  title: {
    fontFamily,
    fontSize: fontSize.title,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily,
    fontSize: fontSize.body,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  caption: {
    fontFamily,
    fontSize: fontSize.caption,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
});

export const theme = { colors, spacing, radius, sizes, fontFamily, fontSize, text } as const;
export type Theme = typeof theme;
