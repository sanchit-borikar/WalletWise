/**
 * Web stand-in for react-native-maps, which has no web version. The Best Card tab still
 * works on web through its list and place search; only the map drawing is replaced.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

type MapProps = { style?: StyleProp<ViewStyle>; children?: React.ReactNode } & Record<string, unknown>;

export default class MapView extends React.Component<MapProps> {
  /** No camera on web: kept so callers can use the same ref API as on the phone. */
  animateToRegion(_region: Region, _duration?: number) {}

  render() {
    return (
      <View style={[styles.map, this.props.style]}>
        <Text style={styles.text}>The map shows in the phone app. Use the list and search here.</Text>
      </View>
    );
  }
}

const Nothing = (_props: Record<string, unknown>) => null;
export const Circle = Nothing;
export const Marker = Nothing;
export const UrlTile = Nothing;

const styles = StyleSheet.create({
  map: { backgroundColor: '#101418', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#8A8A8A', fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
});
