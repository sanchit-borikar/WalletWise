import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const noSubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * The server snapshot is false and the client snapshot true, so the first client render after
 * hydration uses the real scheme without a state update in an effect.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
