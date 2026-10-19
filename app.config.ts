/**
 * Adds settings that come from environment variables to app.json. Locally they are read
 * from .env; on EAS Build from the EAS environment variables of the build profile's
 * environment (see eas.json and server/DEPLOY.md). Keys are never committed.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Google Maps (used by react-native-maps on Android). Without it, the map tab shows a list only.
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  return {
    ...(config as ExpoConfig),
    plugins: [...(config.plugins ?? []), ['react-native-maps', androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}]],
    extra: { ...config.extra, androidGoogleMapsKeySet: !!androidGoogleMapsApiKey },
  };
};
