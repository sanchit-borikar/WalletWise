export const colors = {
  background: '#0A0A0A',
  surface: '#141414',
  text: {
    primary: '#F5F5F5',
    secondary: '#8A8A8A',
  },
  accent: {
    goldStart: '#F5D06F',
    goldEnd: '#C9962E',
    goldGradient: ['#F5D06F', '#C9962E'] as const,
    goldGradientSubtle: ['rgba(245, 208, 111, 0.2)', 'rgba(201, 150, 46, 0)'] as const,
    danger: '#C9412E',
  },
  border: {
    hairline: ['rgba(245,208,111,0.5)', 'transparent'] as const,
  },
  card: {
    surfaceGradient: ['#1C1C1C', '#0A0A0A'] as const,
  }
};
