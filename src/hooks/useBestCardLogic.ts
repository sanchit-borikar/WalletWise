import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useCardStore } from '../store/useCardStore';
import type { CardData } from '../store/useCardStore';
import { classifyCategory, MerchantCategory, normalizeMerchant } from '../utils/merchantClassifier';
import { getRankedRecommendations, RecommendationResult } from '../utils/recommendationEngine';
import { haversineDistance } from '../utils/geospatial';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export type LocationCoord = { lat: number; lon: number };
export type EnrichedPlace = {
  id: string;
  name: string;
  address: string;
  normalizedName: string;
  category: MerchantCategory;
  center: [number, number];
  distanceKm: number;
  recommendation: RecommendationResult | null;
  raw: any;
};

/** Turns a Mapbox feature into a place with a category, distance and the best wallet card. */
export function enrichFeature(
  feature: any,
  fallbackCategory: MerchantCategory,
  from: LocationCoord | null,
  cards: CardData[],
): EnrichedPlace {
  const rawName = feature.text;
  const normName = normalizeMerchant(rawName);
  const classified = classifyCategory(rawName, feature.properties?.category);
  // Use the chosen chip's category when the classifier cannot tell.
  const category = classified === 'Unknown' ? (fallbackCategory === ('All' as MerchantCategory) ? 'Unknown' : fallbackCategory) : classified;
  const [lon, lat] = feature.center;
  const distanceKm = from ? haversineDistance(from.lat, from.lon, lat, lon) : 0;
  const recommendations = getRankedRecommendations(normName, category, cards);
  return {
    id: feature.id,
    name: rawName,
    address: feature.place_name ?? '',
    normalizedName: normName,
    category,
    center: [lon, lat],
    distanceKm,
    recommendation: recommendations[0] ?? null,
    raw: feature,
  };
}

export function useBestCardLogic() {
  const { cards } = useCardStore();
  
  // State
  const [activeCategory, setActiveCategory] = useState('Dining');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [userLocation, setUserLocation] = useState<LocationCoord | null>(null);
  const [customCenter, setCustomCenter] = useState<LocationCoord | null>(null);
  
  const [places, setPlaces] = useState<EnrichedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for tracking stale requests
  const latestSearchQuery = useRef('');
  const latestNearbyQuery = useRef<{ center: LocationCoord, cat: string } | null>(null);

  const activeLocation = customCenter || userLocation;

  // 1. Initial Location Request
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let initialCameraSet = false;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLoading(false);
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (location) => {
            // Only update if accuracy is decent (less than 1000 meters)
            if (location.coords.accuracy && location.coords.accuracy > 1000) return;
            
            const coords = { lat: location.coords.latitude, lon: location.coords.longitude };
            setUserLocation(coords);
            
            if (!initialCameraSet) {
              initialCameraSet = true;
              setIsLoading(false);
            }
          }
        );
      } catch (err) {
        setIsLoading(false);
      }
    })();
    return () => { if (locationSubscription) locationSubscription.remove(); };
  }, []);

  // 2. Debounced Autocomplete Search
  useEffect(() => {
    const q = searchQuery.trim();
    latestSearchQuery.current = q;
    
    if (!activeLocation || q.length < 2) {
      setSearchResults([]);
      return;
    }

    const fetchSearch = async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?proximity=${activeLocation.lon},${activeLocation.lat}&access_token=${MAPBOX_TOKEN}&limit=5`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Ensure latest request wins
        if (latestSearchQuery.current === q && data.features) {
          // Basic ranking: exact match > partial match
          const ranked = data.features.sort((a: any, b: any) => {
            const aName = a.text.toLowerCase();
            const bName = b.text.toLowerCase();
            const lowQ = q.toLowerCase();
            if (aName === lowQ && bName !== lowQ) return -1;
            if (bName === lowQ && aName !== lowQ) return 1;
            return 0;
          });
          setSearchResults(ranked);
        }
      } catch (err) {}
    };
    
    const timer = setTimeout(fetchSearch, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, activeLocation]);

  // 3. Nearby Places Algorithm (Triggers on Category or Location change)
  useEffect(() => {
    if (!activeLocation) return;
    
    const queryMap: Record<string, string> = {
      'Fuel': 'petrol pump',
      'Dining': 'restaurant',
      'Grocery': 'supermarket',
      'Electronics': 'electronics store',
      'Shopping': 'mall',
      'Pharmacy / Health': 'pharmacy',
      'Entertainment': 'cinema',
      'Business': 'office',
      'Travel': 'hotel',
      'All': 'store'
    };
    const mappedQuery = queryMap[activeCategory] || activeCategory;
    
    const currentQuery = { center: activeLocation, cat: mappedQuery };
    latestNearbyQuery.current = currentQuery;

    const fetchPlaces = async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(mappedQuery)}.json?proximity=${activeLocation.lon},${activeLocation.lat}&access_token=${MAPBOX_TOKEN}&limit=12`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (latestNearbyQuery.current === currentQuery && data.features) {
          const enriched: EnrichedPlace[] = data.features.map((feature: any) =>
            enrichFeature(feature, activeCategory as MerchantCategory, activeLocation, cards),
          );
          
          // Sort by distance
          enriched.sort((a, b) => a.distanceKm - b.distanceKm);
          
          setPlaces(enriched);
          setSelectedPlaceId(null);
        }
      } catch (err) {}
    };
    fetchPlaces();
  }, [activeCategory, activeLocation, cards]);

  return {
    activeCategory, setActiveCategory,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    isSearching, setIsSearching,
    userLocation, setUserLocation,
    customCenter, setCustomCenter,
    places, setPlaces,
    selectedPlaceId, setSelectedPlaceId,
    isLoading,
    activeLocation
  };
}
