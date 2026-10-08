import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, interpolate, Extrapolation,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { colors, typography } from '../../theme';
import { CardArt } from '../../components/CardArt';
import { useBestCardLogic } from '../../hooks/useBestCardLogic';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const MODES = ['Max Value', 'Cashback'];
const CATEGORIES = ['All', 'Dining', 'Grocery', 'Electronics', 'Shopping'];

const MAPBOX_TOKEN = 'YOUR_MAPBOX_TOKEN';
const MAPBOX_URL = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

// Snaps (Distance from bottom of screen to top of sheet)
const SNAP_EXPANDED = SCREEN_HEIGHT * 0.85;
const SNAP_MID = SCREEN_HEIGHT * 0.55;
const SNAP_COLLAPSED = SCREEN_HEIGHT * 0.18;

// Map Markers
function AnimatedMarker({ coordinate, isSelected, onPress, title }: any) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.2 : 1, { damping: 12 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Marker coordinate={coordinate} onPress={onPress} style={{ zIndex: isSelected ? 100 : 1 }}>
      <Animated.View style={[styles.markerWrapper, animatedStyle]}>
        <View style={styles.markerCore}>
          <Text style={styles.markerIcon}>●</Text>
        </View>
      </Animated.View>
    </Marker>
  );
}

function UserLocationMarker({ coordinate }: any) {
  const pulse = useSharedValue(1);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: opacity.value,
  }));

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={999}>
      <View style={styles.userMarkerWrapper}>
        <Animated.View style={[styles.userMarkerRing, ringStyle]} />
        <View style={styles.userMarkerCore} />
      </View>
    </Marker>
  );
}

// MAIN COMPONENT
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  
  const {
    activeCategory, setActiveCategory,
    searchQuery, setSearchQuery,
    searchResults,
    isSearching, setIsSearching,
    userLocation,
    customCenter, setCustomCenter,
    places,
    selectedPlaceId, setSelectedPlaceId,
    isLoading,
    activeLocation
  } = useBestCardLogic();

  // Bottom Sheet Shared Values
  const sheetHeight = useSharedValue(SNAP_MID); 
  const isDragging = useSharedValue(false);
  const contextOffset = useSharedValue(0);

  // Active Mode (Dream Goal, Max Value, Cashback)
  const [activeMode, setActiveMode] = useState(MODES[0]);

  // Handle Search Result Selection
  const onSearchResultSelect = (place: any) => {
    const [lon, lat] = place.center;
    setCustomCenter({ lat, lon });
    setIsSearching(false);
    setSearchQuery('');
    mapRef.current?.animateCamera({
      center: { latitude: lat, longitude: lon },
      zoom: 14.5,
    }, { duration: 800 });
  };

  // Marker interaction
  const onMarkerPress = (place: any) => {
    const [lon, lat] = place.center;
    setSelectedPlaceId(place.id);
    mapRef.current?.animateCamera({
      center: { latitude: lat, longitude: lon },
      zoom: 15.5,
    }, { duration: 800 });
  };

  // Bulletproof Bottom Sheet Pan Gesture
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
      contextOffset.value = sheetHeight.value;
    })
    .onUpdate((event) => {
      const newHeight = contextOffset.value - event.translationY;
      sheetHeight.value = Math.max(0, Math.min(SNAP_EXPANDED + 50, newHeight));
    })
    .onEnd((event) => {
      isDragging.value = false;
      const vy = -event.velocityY;
      const projectedHeight = sheetHeight.value + vy * 0.1;
      let dest = sheetHeight.value;
      
      if (projectedHeight > (SNAP_EXPANDED + SNAP_MID) / 2) dest = SNAP_EXPANDED;
      else if (projectedHeight > (SNAP_MID + SNAP_COLLAPSED) / 2) dest = SNAP_MID;
      else dest = SNAP_COLLAPSED;
      
      sheetHeight.value = withSpring(dest, { velocity: vy, damping: 18, stiffness: 150, overshootClamping: true });
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({ height: sheetHeight.value }));

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 40, color: '#F5D06F' }}>◎</Text>
      </View>
    );
  }

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('dining')) return '🍴';
    if (c.includes('grocery')) return '🛒';
    if (c.includes('electronics')) return '📱';
    if (c.includes('shopping')) return '🛍️';
    return '📍';
  };

  return (
    <View style={styles.container}>
      {/* MAP LAYER */}
      <MapView 
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType="none"
        showsUserLocation={false}
        pitchEnabled={true}
        showsCompass={false}
        initialRegion={userLocation ? {
          latitude: customCenter ? customCenter.lat : userLocation.lat,
          longitude: customCenter ? customCenter.lon : userLocation.lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : undefined}
      >
        <UrlTile urlTemplate={MAPBOX_URL} maximumZ={19} flipY={false} />
        {userLocation && <UserLocationMarker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lon }} />}
        
        {places.map((place) => {
          const [lon, lat] = place.center;
          return (
            <AnimatedMarker
              key={place.id}
              coordinate={{ latitude: lat, longitude: lon }}
              isSelected={selectedPlaceId === place.id}
              onPress={() => onMarkerPress(place.raw)}
            />
          );
        })}
      </MapView>

      {/* FLOATING SEARCH BAR OVERLAY */}
      <View style={[styles.headerContainer, { top: insets.top + 10 }]}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search location or merchant..."
            placeholderTextColor="#777"
            keyboardAppearance="dark"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setIsSearching(false); }}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>

        {isSearching && searchResults.length > 0 && (
          <View style={styles.dropdown}>
            {searchResults.map(res => (
              <Pressable key={res.id} style={styles.dropdownRow} onPress={() => onSearchResultSelect(res)}>
                <View style={styles.dropdownIconBox}><Text style={styles.dropdownIcon}>📍</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTitle} numberOfLines={1}>{res.text}</Text>
                  <Text style={styles.dropdownSub} numberOfLines={1}>{res.place_name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* DRAGGABLE BOTTOM SHEET */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.bottomSheet, sheetAnimatedStyle]}>
          <View style={styles.sheetHandleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* STATIC SHEET HEADER */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderTopRow}>
              <View>
                <Text style={styles.sheetHeaderLogo}>Best Card</Text>
                <View style={styles.locationBadge}>
                  <View style={styles.locationDot} />
                  <Text style={styles.locationBadgeText}>{customCenter ? 'Custom area' : 'Near you'}</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable style={styles.actionBtn}><Text style={styles.actionBtnText}>⌘ Scan</Text></Pressable>
                <Pressable style={styles.actionBtnSecondary}><Text style={styles.actionBtnTextSec}>🔔 Store Alert</Text></Pressable>
              </View>
            </View>

            <View style={styles.segmentedControl}>
              <Text style={styles.segmentText}>Dream Goal ⓘ</Text>
              <View style={styles.segmentActive}>
                 <Text style={styles.segmentTextActive}>Max Value ⓘ</Text>
              </View>
              <Text style={styles.segmentText}>Cashback ⓘ</Text>
            </View>

            <RNGHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <Pressable key={cat} onPress={() => setActiveCategory(cat)}>
                    <View style={[styles.categoryChip, isActive && styles.categoryChipActive]}>
                      <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{cat}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </RNGHScrollView>
          </View>

          {/* SCROLLABLE LIST OF PLACES */}
          <RNGHScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>
                {activeCategory} ({places.length})
              </Text>
            </View>

            {places.length > 0 && (
              <View style={styles.altEarnBanner}>
                <Text style={styles.altEarnIcon}>⚲</Text>
                <Text style={styles.altEarnText}>Alternative ways to earn</Text>
                <Text style={styles.altEarnSub}>1 ways ›</Text>
              </View>
            )}

            <View style={styles.placeList}>
              {places.map((place) => {
                const bestRec = place.recommendation;
                const distanceStr = place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1000)} m` : `${place.distanceKm.toFixed(1)} km`;
                const catName = place.category;
                
                return (
                  <View key={place.id} style={styles.placeCard}>
                    {/* Outer Info */}
                    <View style={styles.placeHeader}>
                      <View style={styles.placeIconBox}>
                        <Text style={styles.placeIconTxt}>{getCategoryIcon(catName)}</Text>
                      </View>
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                        <Text style={styles.placeMeta}>{catName} • {distanceStr}</Text>
                      </View>
                    </View>

                    {/* Inner Card Recommendation */}
                    {bestRec && (
                      <Pressable style={styles.recCard} onPress={() => router.push(`/card-detail?id=${bestRec.card.id}`)}>
                        <View style={styles.recCardTop}>
                          <View style={styles.recCardArt}>
                             <CardArt card={bestRec.card} />
                          </View>
                          <View style={styles.recCardInfo}>
                            <View style={styles.recBadge}><Text style={styles.recBadgeTxt}>Best card</Text></View>
                            <Text style={styles.recCardName}>{bestRec.card.cardName.toUpperCase()}</Text>
                          </View>
                          <View style={styles.recCardAction}>
                             <Text style={styles.recPinIcon}>📍</Text>
                          </View>
                        </View>
                        
                        <View style={styles.recDivider} />
                        
                        <View style={styles.recFooter}>
                           <Text style={styles.recPointsNum}>{bestRec.estimatedValue > 100 ? `₹${Math.round(bestRec.estimatedValue)}` : `${Math.round(bestRec.score * 2)}`}</Text>
                           <Text style={styles.recPointsLbl}>{bestRec.estimatedValue > 100 ? 'saved' : 'points'}</Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </RNGHScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070707' },
  
  // Custom Markers
  markerWrapper: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  markerCore: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#111', borderWidth: 2, borderColor: '#F5D06F', justifyContent: 'center', alignItems: 'center' },
  markerIcon: { fontSize: 8, color: '#F5D06F' },

  userMarkerWrapper: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  userMarkerRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,208,111,0.2)' },
  userMarkerCore: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F5D06F', borderWidth: 2, borderColor: '#111' },

  // Floating Search Dropdown
  headerContainer: { position: 'absolute', left: 20, right: 20, zIndex: 10, gap: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,17,17,0.95)', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#333', height: 52, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  searchIcon: { fontSize: 18, marginRight: 12, color: '#A0A0A0' },
  clearIcon: { fontSize: 16, color: '#888', paddingLeft: 12 },
  searchInput: { flex: 1, color: '#F5F5F5', fontFamily: typography.fontFamily, fontSize: 16 },
  
  dropdown: { backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#333', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, elevation: 20 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  dropdownIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(245,208,111,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dropdownIcon: { fontSize: 14 },
  dropdownTitle: { fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  dropdownSub: { fontFamily: typography.fontFamily, fontSize: 12, color: '#888' },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderTopColor: '#222',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 20
  },
  sheetHandleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 12 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#333' },
  
  sheetHeader: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  sheetHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sheetHeaderLogo: { fontFamily: typography.fontFamily, fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#54C78A', marginRight: 6 },
  locationBadgeText: { fontFamily: typography.fontFamily, fontSize: 13, color: '#888', fontWeight: '500' },
  
  actionBtn: { backgroundColor: 'rgba(164, 137, 246, 1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13, fontFamily: typography.fontFamily },
  actionBtnSecondary: { backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(164, 137, 246, 0.3)' },
  actionBtnTextSec: { color: '#A489F6', fontWeight: '600', fontSize: 13, fontFamily: typography.fontFamily },

  segmentedControl: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'space-between' },
  segmentActive: { backgroundColor: '#222', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#333' },
  segmentText: { fontFamily: typography.fontFamily, color: '#6F6F6F', fontSize: 13, fontWeight: '600', paddingHorizontal: 16 },
  segmentTextActive: { color: '#F5D06F', fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' },

  categoryScroll: { flexDirection: 'row' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: '#111', marginRight: 8, borderWidth: 1, borderColor: '#222' },
  categoryChipActive: { backgroundColor: 'rgba(245,208,111,0.1)', borderColor: 'rgba(245,208,111,0.4)' },
  categoryChipText: { fontFamily: typography.fontFamily, color: '#888', fontSize: 13, fontWeight: '600' },
  categoryChipTextActive: { color: '#F5D06F' },

  sheetContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  
  listHeaderRow: { marginBottom: 12 },
  listHeaderTitle: { fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: '#888' },
  
  altEarnBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(164, 137, 246, 0.08)', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(164, 137, 246, 0.2)' },
  altEarnIcon: { color: '#A489F6', fontSize: 16, marginRight: 10, transform: [{rotate: '-45deg'}] },
  altEarnText: { flex: 1, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600', color: '#A489F6' },
  altEarnSub: { fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: '#A489F6', opacity: 0.8 },

  placeList: { gap: 16 },
  placeCard: { backgroundColor: '#111', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#222' },
  placeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  placeIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245,208,111,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  placeIconTxt: { fontSize: 20 },
  placeInfo: { flex: 1 },
  placeName: { fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '700', color: '#F5F5F5', marginBottom: 2 },
  placeMeta: { fontFamily: typography.fontFamily, fontSize: 13, color: '#888' },
  
  recCard: { backgroundColor: '#070707', borderRadius: 16, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  recCardTop: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  recCardArt: { width: 60, height: 40, borderRadius: 6, backgroundColor: '#000', overflow: 'hidden', marginRight: 12 },
  recCardInfo: { flex: 1 },
  recBadge: { backgroundColor: 'rgba(164, 137, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 4, borderWidth: 1, borderColor: 'rgba(164, 137, 246, 0.3)' },
  recBadgeTxt: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', color: '#A489F6' },
  recCardName: { fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', color: '#F5F5F5' },
  recCardAction: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', justifyContent: 'center', alignItems: 'center' },
  recPinIcon: { fontSize: 14 },
  
  recDivider: { height: 1, backgroundColor: '#1A1A1A', marginHorizontal: 16 },
  recFooter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  recPointsNum: { fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '800', color: '#F5F5F5' },
  recPointsLbl: { fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: '#888', marginTop: 2 },
});
