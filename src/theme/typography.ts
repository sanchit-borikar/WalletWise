import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  headings: {
    letterSpacing: -1, // tight letter-spacing on headings
  },
  display: {
    fontWeight: '100' as const, // thin font-weight for large display numbers
    letterSpacing: -1.5,
  },
  base: {
    fontWeight: '400' as const,
  }
};
