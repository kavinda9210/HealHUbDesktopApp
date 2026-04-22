import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import MapLibreView, { MAPLIBRE_STYLE_STREETS_URL, type MapLibreMarker } from '../components/maps/MapLibreView';
import { apiGet, apiPost, apiPostFormData } from '../utils/api';

type AIWoundorRashDetectProps = {
  accessToken?: string;
  onBack?: () => void;
  onOpenDirections?: (input: { origin?: { lat: number; lng: number } | null; destination: { lat: number; lng: number }; destinationName?: string }) => void;
};

type DetectionKind = 'rash' | 'wound' | 'unknown';

type DetectionResult = {
  kind: DetectionKind;
  label: string;
  confidence: number; // 0..1
  severity: 'low' | 'medium' | 'high';
  details: string;
  nextSteps: string[];
};

type DoctorRow = {
  doctor_id: number;
  full_name?: string | null;
  specialization?: string | null;
  qualification?: string | null;
  consultation_fee?: number | null;
  start_time?: string | null;
  end_time?: string | null;
};

type NearbyPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  category: 'hospital' | 'dermatology' | 'clinic';
};

const roundPct = (value: number) => `${Math.round(value * 100)}%`;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapSeverity(value: unknown): DetectionResult['severity'] {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('high')) return 'high';
  if (v.includes('medium')) return 'medium';
  return 'low';
}

function inferMimeType(uri: string): string {
  const lowered = uri.toLowerCase();
  if (lowered.endsWith('.png')) return 'image/png';
  if (lowered.endsWith('.webp')) return 'image/webp';
  if (lowered.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function inferFileName(uri: string): string {
  const parts = uri.split('/');
  const last = parts[parts.length - 1];
  if (last && last.includes('.')) return last;
  const ext = inferMimeType(uri) === 'image/png' ? 'png' : 'jpg';
  return `skin.${ext}`;
}

function mapBackendResultToUi(data: any): DetectionResult {
  const diseaseName = String(data?.disease_name ?? data?.diseaseName ?? data?.predicted_disease ?? 'Unknown');
  const diseaseType = String(data?.type ?? '');
  const confidence = Number(data?.confidence ?? 0);
  const severity = mapSeverity(data?.severity);
  const description = String(data?.description ?? '');
  const recommendation = String(data?.recommendation ?? '');

  return {
    kind: 'rash',
    label: diseaseType ? `${diseaseName} (${diseaseType})` : diseaseName,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    severity,
    details: description || (recommendation ? recommendation : 'Analysis completed.'),
    nextSteps: recommendation ? [recommendation] : [],
  };
}

function buildNearbyCareQuery(result: DetectionResult): string {
  const base = result.kind === 'wound' || result.severity === 'high' ? 'hospital' : 'dermatology clinic';
  const label = String(result.label || '').trim();
  if (!label) return base;
  return `${base} for ${label}`;
}

// Helper function to generate mock places for fallback
function generateMockPlaces(lat: number, lng: number, preferHospitals: boolean): NearbyPlace[] {
  const places: NearbyPlace[] = [];
  
  if (preferHospitals) {
    places.push(
      {
        id: 'mock-hospital-1',
        name: 'City General Hospital',
        lat: lat + 0.008,
        lng: lng + 0.01,
        distanceKm: 1.2,
        category: 'hospital',
      },
      {
        id: 'mock-hospital-2',
        name: 'Community Medical Center',
        lat: lat - 0.01,
        lng: lng + 0.015,
        distanceKm: 2.1,
        category: 'hospital',
      },
      {
        id: 'mock-hospital-3',
        name: 'Emergency Care Hospital',
        lat: lat + 0.015,
        lng: lng - 0.008,
        distanceKm: 2.8,
        category: 'hospital',
      },
      {
        id: 'mock-hospital-4',
        name: 'Memorial Hospital',
        lat: lat - 0.015,
        lng: lng - 0.012,
        distanceKm: 3.5,
        category: 'hospital',
      },
      {
        id: 'mock-hospital-5',
        name: 'St. Mary Medical Center',
        lat: lat + 0.005,
        lng: lng - 0.02,
        distanceKm: 4.2,
        category: 'hospital',
      }
    );
  } else {
    places.push(
      {
        id: 'mock-derm-1',
        name: 'Dermatology Associates',
        lat: lat + 0.006,
        lng: lng + 0.008,
        distanceKm: 1.0,
        category: 'dermatology',
      },
      {
        id: 'mock-derm-2',
        name: 'Advanced Skin Care Clinic',
        lat: lat - 0.008,
        lng: lng + 0.012,
        distanceKm: 1.8,
        category: 'dermatology',
      },
      {
        id: 'mock-derm-3',
        name: 'Dermatology & Skin Surgery Center',
        lat: lat + 0.014,
        lng: lng - 0.006,
        distanceKm: 2.5,
        category: 'dermatology',
      },
      {
        id: 'mock-clinic-1',
        name: 'Family Health Clinic',
        lat: lat - 0.01,
        lng: lng - 0.014,
        distanceKm: 3.0,
        category: 'clinic',
      },
      {
        id: 'mock-clinic-2',
        name: 'Wellness Medical Group',
        lat: lat + 0.02,
        lng: lng + 0.004,
        distanceKm: 3.8,
        category: 'clinic',
      }
    );
  }
  
  return places;
}

export default function AIWoundorRashDetect({ accessToken, onBack, onOpenDirections }: AIWoundorRashDetectProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[] | null>(null);
  const [nearbyError, setNearbyError] = useState<string>('');

  const [nearbyOrigin, setNearbyOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyMapError, setNearbyMapError] = useState(false);

  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState('');
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  const severityBg = useMemo(() => {
    const severity = result?.severity;
    if (!severity) return undefined;

    if (mode === 'dark') {
      if (severity === 'low') return '#14532d';
      if (severity === 'medium') return '#78350f';
      return '#7f1d1d';
    }

    if (severity === 'low') return '#16a34a';
    if (severity === 'medium') return '#f59e0b';
    return '#dc2626';
  }, [mode, result?.severity]);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'AI තුවාල/රෑෂ් හඳුනාගැනීම';
    if (language === 'tamil') return 'AI காயம்/ரேஷ் கண்டறிதல்';
    return 'AI Wound / Rash Detection';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'ඡායාරූපයක් ගෙන හෝ උඩුගත කර විස්තර බලන්න';
    if (language === 'tamil') return 'புகைப்படம் எடுக்கவும் அல்லது பதிவேற்றவும்';
    return 'Take a photo or upload an image to see details';
  }, [language]);

  const takePhotoLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඡායාරූපයක් ගන්න';
    if (language === 'tamil') return 'புகைப்படம் எடு';
    return 'Take photo';
  }, [language]);

  const uploadLabel = useMemo(() => {
    if (language === 'sinhala') return 'රූපය උඩුගත කරන්න';
    if (language === 'tamil') return 'படத்தை பதிவேற்று';
    return 'Upload image';
  }, [language]);

  const analyzeLabel = useMemo(() => {
    if (language === 'sinhala') return 'විශ්ලේෂණය කරමින්...';
    if (language === 'tamil') return 'ஆய்வு செய்கிறது...';
    return 'Analyzing...';
  }, [language]);

  const doctorsTitle = useMemo(() => {
    if (language === 'sinhala') return 'ලබා ගත හැකි වෛද්‍යවරු';
    if (language === 'tamil') return 'கிடைக்கும் மருத்துவர்கள்';
    return 'Available doctors';
  }, [language]);

  const hospitalsTitle = useMemo(() => {
    if (language === 'sinhala') return 'ආසන්න රෝහල්';
    if (language === 'tamil') return 'அருகிலுள்ள மருத்துவமனைகள்';
    return 'Nearby hospitals';
  }, [language]);

  const findNearbyLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආසන්න රෝහල්/චර්ම වෛද්‍ය සේවා සොයන්න';
    if (language === 'tamil') return 'அருகிலுள்ள மருத்துவமனை/தோல் மருத்துவ சேவைகளை தேடு';
    return 'Find nearby hospitals / dermatology';
  }, [language]);

  const openMapsLabel = useMemo(() => {
    if (language === 'sinhala') return 'Maps තුළ විවෘත කරන්න';
    if (language === 'tamil') return 'Maps இல் திற';
    return 'Open in Maps';
  }, [language]);

  const directionsLabel = useMemo(() => {
    if (language === 'sinhala') return 'දිශානතිය';
    if (language === 'tamil') return 'வழிநடத்து';
    return 'Directions';
  }, [language]);

  const openNearbyCareInMaps = async () => {
    if (!result) return;

    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setErrorMessage(
          language === 'sinhala'
            ? 'ස්ථානයට අවසර අවශ්‍යයි. Location permission ලබා දෙන්න.'
            : language === 'tamil'
              ? 'இட அனுமதி தேவை. Location permission வழங்கவும்.'
              : 'Location permission is required.'
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;

      const query = buildNearbyCareQuery(result);

      const urls: string[] = Platform.OS === 'android'
        ? [
            `geo:${lat},${lng}?q=${encodeURIComponent(query)}`,
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} near ${lat},${lng}`)}`,
          ]
        : [
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} near ${lat},${lng}`)}`,
          ];

      for (const url of urls) {
        try {
          await Linking.openURL(url);
          return;
        } catch {
          // try next
        }
      }

      setErrorMessage(language === 'sinhala' ? 'Maps විවෘත කළ නොහැක.' : language === 'tamil' ? 'Maps திறக்க முடியவில்லை.' : 'Cannot open Maps.');
    } catch (e: any) {
      setErrorMessage(e?.message ? String(e.message) : 'Failed to open Maps');
    }
  };

  const fetchNearbyCarePlaces = async () => {
    if (!result) return;

    setNearbyError('');
    setNearbyPlaces(null);
    setNearbyOrigin(null);
    setNearbyMapError(false);
    setNearbyLoading(true);
    
    try {
      // 1. Request location permission
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setNearbyError(
          language === 'sinhala'
            ? 'ස්ථානයට අවසර අවශ්‍යයි. Location permission ලබා දෙන්න.'
            : language === 'tamil'
              ? 'இட அனுமதி தேவை. Location permission வழங்கவும்.'
              : 'Location permission is required.'
        );
        setNearbyLoading(false);
        return;
      }

      // 2. Get current location
      const current = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced 
      });
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      setNearbyOrigin({ lat, lng });

      // 3. Determine what to search for based on result
      const preferHospitals = result.kind === 'wound' || result.severity === 'high';
      const radius = preferHospitals ? 12000 : 7000; // meters
      
      // Calculate bounding box for search (approximate degrees)
      const latOffset = (radius / 111000); // 1 degree lat ≈ 111 km
      const lngOffset = (radius / (111000 * Math.cos(lat * Math.PI / 180)));
      
      const bbox = [
        lng - lngOffset, // min longitude (west)
        lat - latOffset, // min latitude (south)
        lng + lngOffset, // max longitude (east)
        lat + latOffset  // max latitude (north)
      ];
      
      // 4. Search using OpenStreetMap Nominatim API
      const searchQueries = preferHospitals 
        ? ['hospital', 'clinic', 'medical center']
        : ['dermatologist', 'skin clinic', 'dermatology', 'medical clinic'];
      
      let allPlaces: NearbyPlace[] = [];
      const seen = new Set<string>();
      
      // Search for each query term
      for (const query of searchQueries) {
        try {
          const nominatimUrl = 'https://nominatim.openstreetmap.org/search?' +
            `q=${encodeURIComponent(query)}` +
            `&format=json` +
            `&viewbox=${bbox.join(',')}` +
            `&bounded=1` +
            `&limit=10` +
            `&addressdetails=0` +
            `&accept-language=en`;
          
          console.log(`Searching for: ${query}`);
          
          const response = await fetch(nominatimUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Expo-HealthCare-App/1.0', // Required by Nominatim
            },
          });
          
          if (!response.ok) {
            console.warn(`Nominatim search failed for "${query}": ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          for (const item of data) {
            if (!item.lat || !item.lon) continue;
            
            const placeLat = parseFloat(item.lat);
            const placeLng = parseFloat(item.lon);
            const name = item.display_name?.split(',')[0] || query;
            
            // Create unique ID
            const id = `nominatim-${item.place_id}`;
            if (seen.has(id)) continue;
            seen.add(id);
            
            // Calculate distance
            const distanceKm = haversineKm(lat, lng, placeLat, placeLng);
            
            // Only include if within radius
            if (distanceKm <= radius / 1000) {
              // Determine category
              let category: NearbyPlace['category'] = 'clinic';
              const type = item.type || '';
              const displayName = (item.display_name || '').toLowerCase();
              
              if (type === 'hospital' || displayName.includes('hospital')) {
                category = 'hospital';
              } else if (displayName.includes('dermatology') || displayName.includes('skin')) {
                category = 'dermatology';
              }
              
              allPlaces.push({
                id,
                name: name || query,
                lat: placeLat,
                lng: placeLng,
                distanceKm,
                category,
              });
            }
          }
          
          // Add a small delay to respect Nominatim's rate limits (1 request per second)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn(`Error searching for "${query}":`, error);
          continue;
        }
      }
      
      // 5. Remove duplicates and sort by distance
      const uniquePlaces = Array.from(
        new Map(allPlaces.map(place => [place.id, place])).values()
      );
      
      uniquePlaces.sort((a, b) => a.distanceKm - b.distanceKm);
      
      // 6. If no places found, use mock data as fallback
      if (uniquePlaces.length === 0) {
        console.log('No places found from Nominatim, using mock data');
        const mockPlaces = generateMockPlaces(lat, lng, preferHospitals);
        setNearbyPlaces(mockPlaces);
      } else {
        console.log(`Found ${uniquePlaces.length} places`);
        setNearbyPlaces(uniquePlaces.slice(0, 12));
      }
      
    } catch (e: any) {
      console.error('Nearby search error:', e);
      setNearbyError(e?.message ? String(e.message) : 'Nearby search failed');
      
      // Fallback to mock data on error
      if (nearbyOrigin) {
        const preferHospitals = result.kind === 'wound' || result.severity === 'high';
        const mockPlaces = generateMockPlaces(
          nearbyOrigin.lat, 
          nearbyOrigin.lng, 
          preferHospitals
        );
        setNearbyPlaces(mockPlaces);
      }
    } finally {
      setNearbyLoading(false);
    }
  };

  useEffect(() => {
    // Load available doctors from backend DB when we have an analysis result.
    let cancelled = false;

    async function loadDoctors() {
      if (!result) {
        setDoctors([]);
        setDoctorsError('');
        setDoctorsLoading(false);
        return;
      }

      setDoctorsLoading(true);
      setDoctorsError('');
      setDoctors([]);

      try {
        const params = new URLSearchParams();
        if (result.kind === 'rash') params.set('specialization', 'Dermatology');

        const url = params.toString() ? `/api/appointment/doctors?${params.toString()}` : '/api/appointment/doctors';
        const res = await apiGet<any>(url);
        if (cancelled) return;

        if (!res.ok || res.data?.success === false) {
          const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to load doctors';
          setDoctorsError(String(msg));
          setDoctors([]);
          return;
        }

        const rows: DoctorRow[] = Array.isArray(res.data?.data) ? res.data.data : [];
        setDoctors(rows.slice(0, 8));
      } catch (e: any) {
        if (cancelled) return;
        setDoctorsError(e?.message ? String(e.message) : 'Failed to load doctors');
        setDoctors([]);
      } finally {
        if (!cancelled) setDoctorsLoading(false);
      }
    }

    loadDoctors();
    return () => {
      cancelled = true;
    };
  }, [result?.kind, result?.severity]);

  const nearbyMarkers = useMemo<MapLibreMarker[]>(() => {
    const markers: MapLibreMarker[] = [];
    if (nearbyOrigin) {
      markers.push({
        id: 'me',
        lat: nearbyOrigin.lat,
        lng: nearbyOrigin.lng,
        kind: 'patient',
        iconText: '📍',
      });
    }
    const list = Array.isArray(nearbyPlaces) ? nearbyPlaces : [];
    for (const p of list) {
      markers.push({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        kind: 'pin',
        iconText: p.category === 'hospital' ? '🏥' : p.category === 'dermatology' ? '🧴' : '🩺',
        title: p.name,
      });
    }
    return markers;
  }, [nearbyOrigin, nearbyPlaces]);

  const openPlaceDirections = async (place: NearbyPlace) => {
    const dest = `${place.lat},${place.lng}`;
    const label = place.name ? `(${place.name})` : '';

    const urls: string[] = Platform.OS === 'android'
      ? [
          `google.navigation:q=${encodeURIComponent(dest)}`,
          `geo:${dest}?q=${encodeURIComponent(`${dest}${label}`)}`,
          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`,
        ]
      : [
          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`,
        ];

    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // try next
      }
    }

    setErrorMessage(language === 'sinhala' ? 'Maps විවෘත කළ නොහැක.' : language === 'tamil' ? 'Maps திறக்க முடியவில்லை.' : 'Cannot open Maps.');
  };

  const handleDirectionsPress = (place: NearbyPlace) => {
    if (onOpenDirections) {
      onOpenDirections({
        origin: nearbyOrigin,
        destination: { lat: place.lat, lng: place.lng },
        destinationName: place.name,
      });
      return;
    }
    openPlaceDirections(place);
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      base64: true,
    });

    if (picked.canceled) return;

    const uri = picked.assets?.[0]?.uri;
    if (!uri) return;

    const b64 = picked.assets?.[0]?.base64 ?? null;
    await runAnalysis(uri, b64);
  };

  const handleTakePhoto = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) return;

    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
      base64: true,
    });

    if (shot.canceled) return;

    const uri = shot.assets?.[0]?.uri;
    if (!uri) return;

    const b64 = shot.assets?.[0]?.base64 ?? null;
    await runAnalysis(uri, b64);
  };

  const runAnalysis = async (uri: string, b64?: string | null) => {
    setImageUri(uri);
    setImageBase64(b64 ?? null);
    setResult(null);
    setIsAnalyzing(true);
    setErrorMessage('');

    if (!accessToken) {
      setErrorMessage('Please log in to analyze images');
      setIsAnalyzing(false);
      return;
    }

    // Prefer JSON base64 to avoid multipart chunked-upload issues on some Android phones.
    if (b64) {
      if (!accessToken) {
        setErrorMessage('Authentication token is missing. Please log in again.');
        setIsAnalyzing(false);
        return;
      }

      const response = await apiPost<any>('/api/skin-disease/predict', {
        image_base64: b64,
        filename: inferFileName(uri),
      }, accessToken);

      if (!response.ok) {
        const msg =
          (response.data && (response.data.message || response.data.error)) ||
          (response.status === 401 ? 'Session expired. Please log in again.' : 'Failed to analyze image');
        setErrorMessage(String(msg));
        setIsAnalyzing(false);
        return;
      }

      if (response.data && response.data.success === false) {
        setErrorMessage(String(response.data.message || 'Failed to analyze image'));
        setIsAnalyzing(false);
        return;
      }

      const mapped = mapBackendResultToUi(response.data?.data);
      setResult(mapped);
      setIsAnalyzing(false);
      return;
    }

    // Fallback: multipart upload
    const form = new FormData();
    const name = inferFileName(uri);
    const mimeType = inferMimeType(uri);

    try {
      const fileRes = await fetch(uri);
      const blob = await fileRes.blob();
      form.append('image', blob as any, name);
    } catch {
      form.append('image', { uri, name, type: mimeType } as any);
    }

    const response = await apiPostFormData<any>('/api/skin-disease/predict', form, accessToken);
    if (!response.ok) {
      if (response.status === 0 && response.data?.url) {
        setErrorMessage(`Network request failed: ${String(response.data.url)}`);
      } else {
        const msg =
          (response.data && (response.data.message || response.data.error)) ||
          (response.status === 401 ? 'Session expired. Please log in again.' : 'Failed to analyze image');
        setErrorMessage(String(msg));
      }
      setIsAnalyzing(false);
      return;
    }

    if (response.data && response.data.success === false) {
      setErrorMessage(String(response.data.message || 'Failed to analyze image'));
      setIsAnalyzing(false);
      return;
    }

    const mapped = mapBackendResultToUi(response.data?.data);
    setResult(mapped);
    setIsAnalyzing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
      <ScrollView
        style={[styles.safe, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          {!!onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.backText, { color: colors.primary }]}>
                {language === 'sinhala' ? 'ආපසු' : language === 'tamil' ? 'பின்செல்' : 'Back'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.85}
            onPress={handleTakePhoto}
          >
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={[styles.actionText, { color: colors.text }]}>{takePhotoLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.85}
            onPress={handlePickFromLibrary}
          >
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={[styles.actionText, { color: colors.text }]}>{uploadLabel}</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          </View>
        ) : (
          <View style={[styles.emptyPreview, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={styles.emptyPreviewIcon}>🩺</Text>
            <Text style={[styles.emptyPreviewText, { color: colors.subtext }]}>
              {language === 'sinhala'
                ? 'රූපයක් තෝරාගන්න'
                : language === 'tamil'
                  ? 'ஒரு படத்தை தேர்ந்தெடுக்கவும்'
                  : 'Select an image to begin'}
            </Text>
          </View>
        )}

        {isAnalyzing && (
          <View style={styles.analyzingRow}>
            <ActivityIndicator />
            <Text style={[styles.analyzingText, { color: colors.subtext }]}>{analyzeLabel}</Text>
          </View>
        )}

        {!!errorMessage && !isAnalyzing && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.text }]}>{errorMessage}</Text>
          </View>
        )}

        {!!result && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeaderRow}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>{result.label}</Text>
              <Text style={[styles.confidence, { color: colors.primary }]}>{roundPct(result.confidence)}</Text>
            </View>

            <View style={styles.pillsRow}>
              <View style={[styles.pill, { backgroundColor: severityBg ?? colors.primary }]}>
                <Text style={styles.pillText}>
                  {language === 'sinhala'
                    ? result.severity === 'low'
                      ? 'අඩු'
                      : result.severity === 'medium'
                        ? 'මධ්‍යම'
                        : 'ඉහළ'
                    : language === 'tamil'
                      ? result.severity === 'low'
                        ? 'குறைவு'
                        : result.severity === 'medium'
                          ? 'நடுத்தர'
                          : 'அதிகம்'
                      : result.severity.toUpperCase()}{' '}
                  {language === 'sinhala' ? 'තීව්‍රතාව' : language === 'tamil' ? 'தீவிரம்' : 'severity'}
                </Text>
              </View>

              <View style={[styles.pillNeutral, { backgroundColor: colors.border }]}>
                <Text style={[styles.pillNeutralText, { color: colors.text }]}>
                  {result.kind === 'rash'
                    ? language === 'sinhala'
                      ? 'රෑෂ්'
                      : language === 'tamil'
                        ? 'ரேஷ்'
                        : 'Rash'
                    : result.kind === 'wound'
                      ? language === 'sinhala'
                        ? 'තුවාල'
                        : language === 'tamil'
                          ? 'காயம்'
                          : 'Wound'
                      : language === 'sinhala'
                        ? 'නොදන්නා'
                        : language === 'tamil'
                          ? 'தெரியாது'
                          : 'Unknown'}
                </Text>
              </View>
            </View>

            <Text style={[styles.resultDetails, { color: colors.subtext }]}>{result.details}</Text>

            <Text style={[styles.nextTitle, { color: colors.text }]}>
              {language === 'sinhala' ? 'ඊළඟ පියවර' : language === 'tamil' ? 'அடுத்த படிகள்' : 'Next steps'}
            </Text>
            {result.nextSteps.map((s, idx) => (
              <Text key={idx} style={[styles.bullet, { color: colors.subtext }]}>
                • {s}
              </Text>
            ))}
          </View>
        )}

        {!!result && (
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{doctorsTitle}</Text>

            {doctorsLoading && (
              <View style={{ marginTop: 10 }}>
                <ActivityIndicator />
              </View>
            )}

            {!!doctorsError && !doctorsLoading && (
              <Text style={[styles.disclaimer, { color: colors.subtext }]}>{doctorsError}</Text>
            )}

            {!doctorsLoading && !doctorsError && doctors.length === 0 && (
              <Text style={[styles.disclaimer, { color: colors.subtext }]}>
                {language === 'sinhala'
                  ? 'දත්ත ගබඩාවේ වෛද්‍යවරු නොමැත.'
                  : language === 'tamil'
                    ? 'தரவுத்தளத்தில் மருத்துவர்கள் இல்லை.'
                    : 'No doctors found in the database.'}
              </Text>
            )}

            {!doctorsLoading && !doctorsError && doctors.map((d) => {
              const name = d.full_name ? `Dr. ${String(d.full_name)}` : `Doctor #${String(d.doctor_id)}`;
              const subParts = [
                d.specialization ? String(d.specialization) : '',
                d.qualification ? String(d.qualification) : '',
                typeof d.consultation_fee === 'number' ? `Fee: ${d.consultation_fee}` : '',
              ].filter((x) => String(x).trim().length > 0);
              const sub = subParts.join(' • ');

              return (
                <View key={String(d.doctor_id)} style={[styles.rowItem, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{name}</Text>
                    {!!sub && <Text style={[styles.rowSub, { color: colors.subtext }]}>{sub}</Text>}
                  </View>
                  <TouchableOpacity style={[styles.smallButton, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
                    <Text style={styles.smallButtonText}>
                      {language === 'sinhala' ? 'වෙන්කරගන්න' : language === 'tamil' ? 'முன்பதிவு' : 'Book'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {!!result && (
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{hospitalsTitle}</Text>

            <TouchableOpacity
              style={[styles.primaryNearbyBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={fetchNearbyCarePlaces}
              disabled={nearbyLoading}
            >
              {nearbyLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryNearbyBtnText}>{findNearbyLabel}</Text>
              )}
            </TouchableOpacity>

            {!!nearbyError && !nearbyLoading && (
              <View style={styles.errorWrap}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={[styles.errorText, { color: colors.text }]}>{nearbyError}</Text>
              </View>
            )}

            {!!nearbyPlaces && nearbyPlaces.length === 0 && !nearbyLoading && (
              <Text style={[styles.disclaimer, { color: colors.subtext }]}>No nearby places found.</Text>
            )}

            {!!nearbyPlaces && nearbyPlaces.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {(nearbyOrigin && Platform.OS !== 'web') ? (
                  <View style={[styles.mapWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                    {!nearbyMapError ? (
                      <View style={StyleSheet.absoluteFillObject}>
                        <MapLibreView
                          styleUrl={MAPLIBRE_STYLE_STREETS_URL}
                          markers={nearbyMarkers}
                          polyline={null}
                          focus={{ lat: nearbyOrigin.lat, lng: nearbyOrigin.lng, zoom: 13 }}
                          onLoadError={() => setNearbyMapError(true)}
                        />
                      </View>
                    ) : (
                      <View style={styles.mapFallbackCenter}>
                        <Text style={[styles.disclaimer, { color: colors.subtext, marginTop: 0, textAlign: 'center' }]}>
                          {language === 'sinhala'
                            ? 'සිතියම පූරණය නොවීය. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.'
                            : language === 'tamil'
                              ? 'வரைபடம் ஏற்றப்படவில்லை. இணைய இணைப்பை சரிபார்க்கவும்.'
                              : 'Map failed to load. Check your internet connection.'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {nearbyPlaces.map((p) => (
                  <View key={p.id} style={[styles.rowItem, { borderTopColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{p.name}</Text>
                      <Text style={[styles.rowSub, { color: colors.subtext }]}>
                        {p.distanceKm.toFixed(1)} km • {p.category}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.smallButtonOutline, { backgroundColor: colors.background, borderColor: colors.primary }]}
                      activeOpacity={0.85}
                      onPress={() => handleDirectionsPress(p)}
                    >
                      <Text style={[styles.smallButtonOutlineText, { color: colors.primary }]}>{directionsLabel}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.smallButtonOutline, { marginTop: 10, alignSelf: 'flex-start', backgroundColor: colors.background, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={openNearbyCareInMaps}
                >
                  <Text style={[styles.smallButtonOutlineText, { color: colors.subtext }]}>{openMapsLabel}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.disclaimer, { color: colors.subtext }]}>
              {language === 'sinhala'
                ? 'GPS භාවිතා කර ආසන්න ස්ථාන සොයයි (OpenStreetMap දත්ත).'
                : language === 'tamil'
                  ? 'GPS பயன்படுத்தி அருகிலுள்ள இடங்களை தேடும் (OpenStreetMap தரவு).'
                  : 'Uses GPS to find nearby places (OpenStreetMap data).'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  primaryNearbyBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryNearbyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  mapWrap: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    height: 200,
  },
  mapFallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  errorWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  backText: {
    fontWeight: '900',
    fontSize: 14,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  previewCard: {
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  preview: {
    width: '100%',
    height: 220,
  },
  emptyPreview: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyPreviewText: {
    fontSize: 13,
    fontWeight: '700',
  },
  analyzingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyzingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  resultTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  confidence: {
    fontSize: 13,
    fontWeight: '900',
  },
  pillsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  pillNeutral: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  pillNeutralText: {
    fontSize: 12,
    fontWeight: '900',
  },
  resultDetails: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  nextTitle: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '900',
  },
  bullet: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  listCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  rowSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  smallButtonOutline: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallButtonOutlineText: {
    fontWeight: '900',
    fontSize: 12,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});