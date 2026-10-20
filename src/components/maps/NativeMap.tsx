/**
 * The map library, behind one import so the web build can use NativeMap.web.tsx instead
 * (react-native-maps has no web version and crashes the web bundle).
 */
export { default, Circle, Marker, UrlTile } from 'react-native-maps';
export type { Region } from 'react-native-maps';
