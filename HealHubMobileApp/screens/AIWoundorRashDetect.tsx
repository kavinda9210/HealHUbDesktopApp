import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import MapLibreView, { MAPLIBRE_STYLE_STREETS_URL, type MapLibreMarker } from '../components/maps/MapLibreView';
import { apiGet, apiPost, apiPostFormData } from '../utils/api';

// ----------------------------- TYPES ------------------------------------
type AIWoundorRashDetectProps = {
  accessToken?: string;
  onBack?: () => void;
  onOpenDirections?: (input: { origin?: { lat: number; lng: number } | null; destination: { lat: number; lng: number }; destinationName?: string }) => void;
};

type DetectionKind = 'rash' | 'wound' | 'unknown';

type DetectionResult = {
  kind: DetectionKind;
  label: string;
  confidence: number;
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

// ----------------------------- HELPERS (keep all your existing helpers) -----------------------------
const roundPct = (value: number) => `${Math.round(value * 100)}%`;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
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

function generateMockPlaces(lat: number, lng: number, preferHospitals: boolean): NearbyPlace[] {
  const places: NearbyPlace[] = [];
  if (preferHospitals) {
    places.push(
      { id: 'mock-hospital-1', name: 'City General Hospital', lat: lat + 0.008, lng: lng + 0.01, distanceKm: 1.2, category: 'hospital' },
      { id: 'mock-hospital-2', name: 'Community Medical Center', lat: lat - 0.01, lng: lng + 0.015, distanceKm: 2.1, category: 'hospital' },
      { id: 'mock-hospital-3', name: 'Emergency Care Hospital', lat: lat + 0.015, lng: lng - 0.008, distanceKm: 2.8, category: 'hospital' },
      { id: 'mock-hospital-4', name: 'Memorial Hospital', lat: lat - 0.015, lng: lng - 0.012, distanceKm: 3.5, category: 'hospital' },
      { id: 'mock-hospital-5', name: 'St. Mary Medical Center', lat: lat + 0.005, lng: lng - 0.02, distanceKm: 4.2, category: 'hospital' }
    );
  } else {
    places.push(
      { id: 'mock-derm-1', name: 'Dermatology Associates', lat: lat + 0.006, lng: lng + 0.008, distanceKm: 1.0, category: 'dermatology' },
      { id: 'mock-derm-2', name: 'Advanced Skin Care Clinic', lat: lat - 0.008, lng: lng + 0.012, distanceKm: 1.8, category: 'dermatology' },
      { id: 'mock-derm-3', name: 'Dermatology & Skin Surgery Center', lat: lat + 0.014, lng: lng - 0.006, distanceKm: 2.5, category: 'dermatology' },
      { id: 'mock-clinic-1', name: 'Family Health Clinic', lat: lat - 0.01, lng: lng - 0.014, distanceKm: 3.0, category: 'clinic' },
      { id: 'mock-clinic-2', name: 'Wellness Medical Group', lat: lat + 0.02, lng: lng + 0.004, distanceKm: 3.8, category: 'clinic' }
    );
  }
  return places;
}

// ----------------------------- MAIN COMPONENT ----------------------------
export default function AIWoundorRashDetect({ accessToken, onBack, onOpenDirections }: AIWoundorRashDetectProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  // State (all existing)
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
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
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

  // Map helpers
  const centerOnCurrentLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapFocus({ lat: current.coords.latitude, lng: current.coords.longitude, zoom: 14 });
    } catch (e) {
      if (nearbyOrigin) setMapFocus({ lat: nearbyOrigin.lat, lng: nearbyOrigin.lng, zoom: 14 });
    }
  };

  useEffect(() => {
    if (nearbyOrigin) setMapFocus({ lat: nearbyOrigin.lat, lng: nearbyOrigin.lng, zoom: 13 });
  }, [nearbyOrigin]);

  const openStreetViewForPlace = async (place: NearbyPlace) => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${place.lat},${place.lng}`;
    try { await Linking.openURL(url); } catch {}
  };

  // Fetch nearby places (same as before)
  const fetchNearbyCarePlaces = async () => {
    if (!result) return;
    setNearbyError('');
    setNearbyPlaces(null);
    setNearbyOrigin(null);
    setNearbyMapError(false);
    setNearbyLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setNearbyError(
          language === 'sinhala' ? 'ස්ථානයට අවසර අවශ්‍යයි.' :
          language === 'tamil' ? 'இட அனுமதி தேவை.' : 'Location permission required.'
        );
        setNearbyLoading(false);
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      setNearbyOrigin({ lat, lng });
      const preferHospitals = result.kind === 'wound' || result.severity === 'high';
      const radius = preferHospitals ? 12000 : 7000;
      const latOffset = radius / 111000;
      const lngOffset = radius / (111000 * Math.cos(lat * Math.PI / 180));
      const bbox = [lng - lngOffset, lat - latOffset, lng + lngOffset, lat + latOffset];
      const searchQueries = preferHospitals
        ? ['hospital', 'clinic', 'medical center']
        : ['dermatologist', 'skin clinic', 'dermatology', 'medical clinic'];
      let allPlaces: NearbyPlace[] = [];
      const seen = new Set<string>();
      for (const query of searchQueries) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&viewbox=${bbox.join(',')}&bounded=1&limit=15&addressdetails=0&accept-language=en`;
          const response = await fetch(nominatimUrl, { headers: { 'User-Agent': 'Expo-HealthCare-App/1.0' } });
          if (!response.ok) continue;
          const data = await response.json();
          for (const item of data) {
            if (!item.lat || !item.lon) continue;
            const placeLat = parseFloat(item.lat);
            const placeLng = parseFloat(item.lon);
            const name = item.display_name?.split(',')[0] || query;
            const id = `nominatim-${item.place_id}`;
            if (seen.has(id)) continue;
            seen.add(id);
            const distanceKm = haversineKm(lat, lng, placeLat, placeLng);
            if (distanceKm <= radius / 1000) {
              let category: NearbyPlace['category'] = 'clinic';
              const type = item.type || '';
              const displayName = (item.display_name || '').toLowerCase();
              if (type === 'hospital' || displayName.includes('hospital')) category = 'hospital';
              else if (displayName.includes('dermatology') || displayName.includes('skin')) category = 'dermatology';
              allPlaces.push({ id, name: name || query, lat: placeLat, lng: placeLng, distanceKm, category });
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) { console.warn(err); }
      }
      const uniquePlaces = Array.from(new Map(allPlaces.map(p => [p.id, p])).values());
      uniquePlaces.sort((a, b) => a.distanceKm - b.distanceKm);
      if (uniquePlaces.length === 0) {
        const mockPlaces = generateMockPlaces(lat, lng, preferHospitals);
        setNearbyPlaces(mockPlaces);
      } else {
        setNearbyPlaces(uniquePlaces.slice(0, 12));
      }
    } catch (e: any) {
      console.error(e);
      setNearbyError(e?.message ? String(e.message) : 'Nearby search failed');
      if (nearbyOrigin) {
        const preferHospitals = result.kind === 'wound' || result.severity === 'high';
        const mockPlaces = generateMockPlaces(nearbyOrigin.lat, nearbyOrigin.lng, preferHospitals);
        setNearbyPlaces(mockPlaces);
      }
    } finally {
      setNearbyLoading(false);
    }
  };

  // Doctors loading (unchanged)
  useEffect(() => {
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
    return () => { cancelled = true; };
  }, [result?.kind, result?.severity]);

  // Image analysis (unchanged)
  const runAnalysis = async (uri: string, b64?: string | null) => {
    setImageUri(uri);
    setImageBase64(b64 ?? null);
    setResult(null);
    setIsAnalyzing(true);
    setErrorMessage('');
    if (!accessToken) { setErrorMessage('Please log in to analyze images'); setIsAnalyzing(false); return; }
    if (b64) {
      const response = await apiPost<any>('/api/skin-disease/predict', { image_base64: b64, filename: inferFileName(uri) }, accessToken);
      if (!response.ok) {
        const msg = (response.data && (response.data.message || response.data.error)) || (response.status === 401 ? 'Session expired.' : 'Failed to analyze');
        setErrorMessage(String(msg));
        setIsAnalyzing(false);
        return;
      }
      if (response.data && response.data.success === false) { setErrorMessage(String(response.data.message || 'Failed')); setIsAnalyzing(false); return; }
      const mapped = mapBackendResultToUi(response.data?.data);
      setResult(mapped);
      setIsAnalyzing(false);
      return;
    }
    const form = new FormData();
    const name = inferFileName(uri);
    const mimeType = inferMimeType(uri);
    try {
      const fileRes = await fetch(uri);
      const blob = await fileRes.blob();
      form.append('image', blob as any, name);
    } catch { form.append('image', { uri, name, type: mimeType } as any); }
    const response = await apiPostFormData<any>('/api/skin-disease/predict', form, accessToken);
    if (!response.ok) {
      const msg = (response.data && (response.data.message || response.data.error)) || (response.status === 401 ? 'Session expired.' : 'Failed to analyze');
      setErrorMessage(String(msg));
      setIsAnalyzing(false);
      return;
    }
    if (response.data && response.data.success === false) { setErrorMessage(String(response.data.message || 'Failed')); setIsAnalyzing(false); return; }
    const mapped = mapBackendResultToUi(response.data?.data);
    setResult(mapped);
    setIsAnalyzing(false);
  };

  const handleTakePhoto = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) return;
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: true, base64: true });
    if (shot.canceled) return;
    const uri = shot.assets?.[0]?.uri;
    if (!uri) return;
    const b64 = shot.assets?.[0]?.base64 ?? null;
    await runAnalysis(uri, b64);
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, base64: true });
    if (picked.canceled) return;
    const uri = picked.assets?.[0]?.uri;
    if (!uri) return;
    const b64 = picked.assets?.[0]?.base64 ?? null;
    await runAnalysis(uri, b64);
  };

  const openPlaceDirections = async (place: NearbyPlace) => {
    const dest = `${place.lat},${place.lng}`;
    const urls = Platform.OS === 'android'
      ? [`google.navigation:q=${encodeURIComponent(dest)}`, `geo:${dest}?q=${encodeURIComponent(dest)}`, `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`]
      : [`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`];
    for (const url of urls) { try { await Linking.openURL(url); return; } catch {} }
    setErrorMessage(language === 'sinhala' ? 'Maps විවෘත කළ නොහැක.' : language === 'tamil' ? 'Maps திறக்க முடியவில்லை.' : 'Cannot open Maps.');
  };

  const handleDirectionsPress = (place: NearbyPlace) => {
    if (onOpenDirections) {
      onOpenDirections({ origin: nearbyOrigin, destination: { lat: place.lat, lng: place.lng }, destinationName: place.name });
      return;
    }
    openPlaceDirections(place);
  };

  const nearbyMarkers = useMemo<MapLibreMarker[]>(() => {
    const markers: MapLibreMarker[] = [];
    if (nearbyOrigin) markers.push({ id: 'me', lat: nearbyOrigin.lat, lng: nearbyOrigin.lng, kind: 'patient', iconText: '📍', title: 'You' });
    (nearbyPlaces || []).forEach(p => markers.push({ id: p.id, lat: p.lat, lng: p.lng, kind: 'pin', iconText: p.category === 'hospital' ? '🏥' : p.category === 'dermatology' ? '🧴' : '🩺', title: p.name }));
    return markers;
  }, [nearbyOrigin, nearbyPlaces]);

  // UI helpers
  const findNearbyLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආසන්න රෝහල්/චර්ම වෛද්‍ය සේවා සොයන්න';
    if (language === 'tamil') return 'அருகிலுள்ள மருத்துவமனை/தோல் மருத்துவ சேவைகளை தேடு';
    return 'Find nearby hospitals / dermatology';
  }, [language]);

  const ModernCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[modernStyles.card, { backgroundColor: colors.card, borderColor: colors.border + '40' }, style]}>{children}</View>
  );

  const SectionHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
    <View style={modernStyles.sectionHeaderRow}>
      {icon && <View style={modernStyles.sectionIcon}>{icon}</View>}
      <Text style={[modernStyles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  // Render
  return (
    <SafeAreaView style={[modernStyles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
      <ScrollView contentContainerStyle={[modernStyles.container, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
        {/* Header */}
        <View style={modernStyles.headerRow}>
          <View style={modernStyles.headerLeft}>
            <MaterialCommunityIcons name="brain" size={28} color={colors.primary} />
            <Text style={[modernStyles.title, { color: colors.primary }]}>
              {language === 'sinhala' ? 'AI තුවාල/රෑෂ් හඳුනාගැනීම' : language === 'tamil' ? 'AI காயம்/ரேஷ் கண்டறிதல்' : 'AI Wound / Rash Detection'}
            </Text>
          </View>
          {!!onBack && <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={modernStyles.backButton}><Ionicons name="arrow-back" size={24} color={colors.primary} /><Text style={[modernStyles.backText, { color: colors.primary }]}>{language === 'sinhala' ? 'ආපසු' : language === 'tamil' ? 'பின்செல்' : 'Back'}</Text></TouchableOpacity>}
        </View>
        <Text style={[modernStyles.subtitle, { color: colors.subtext }]}>{language === 'sinhala' ? 'ඡායාරූපයක් ගෙන හෝ උඩුගත කර විස්තර බලන්න' : language === 'tamil' ? 'புகைப்படம் எடுக்கவும் அல்லது பதிவேற்றவும்' : 'Take a photo or upload an image'}</Text>

        {/* Action Buttons unchanged */}
        <View style={modernStyles.actionsRow}>
          <TouchableOpacity style={[modernStyles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleTakePhoto}>
            <View style={[modernStyles.actionIconBg, { backgroundColor: colors.primary + '10' }]}><Feather name="camera" size={24} color={colors.primary} /></View>
            <Text style={[modernStyles.actionText, { color: colors.text }]}>{language === 'sinhala' ? 'ඡායාරූපයක් ගන්න' : language === 'tamil' ? 'புகைப்படம் எடு' : 'Take photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modernStyles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handlePickFromLibrary}>
            <View style={[modernStyles.actionIconBg, { backgroundColor: colors.primary + '10' }]}><Feather name="image" size={24} color={colors.primary} /></View>
            <Text style={[modernStyles.actionText, { color: colors.text }]}>{language === 'sinhala' ? 'රූපය උඩුගත කරන්න' : language === 'tamil' ? 'படத்தை பதிவேற்று' : 'Upload image'}</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        {imageUri ? <ModernCard style={modernStyles.previewCard}><Image source={{ uri: imageUri }} style={modernStyles.preview} contentFit="cover" /></ModernCard> : <View style={[modernStyles.emptyPreview, { borderColor: colors.border, backgroundColor: colors.card }]}><MaterialCommunityIcons name="image-plus" size={48} color={colors.subtext + '50'} /><Text style={[modernStyles.emptyPreviewText, { color: colors.subtext }]}>{language === 'sinhala' ? 'රූපයක් තෝරාගන්න' : language === 'tamil' ? 'ஒரு படத்தை தேர்ந்தெடுக்கவும்' : 'Select an image'}</Text></View>}

        {isAnalyzing && <View style={modernStyles.analyzingRow}><ActivityIndicator size="large" color={colors.primary} /><Text style={[modernStyles.analyzingText, { color: colors.subtext }]}>{language === 'sinhala' ? 'විශ්ලේෂණය කරමින්...' : language === 'tamil' ? 'ஆய்வு செய்கிறது...' : 'Analyzing...'}</Text></View>}
        {!!errorMessage && !isAnalyzing && <ModernCard style={[modernStyles.errorCard, { borderLeftColor: colors.danger, borderLeftWidth: 4 }]}><View style={modernStyles.errorContainer}><Ionicons name="warning-outline" size={24} color={colors.danger} /><Text style={[modernStyles.errorText, { color: colors.text, flexShrink: 1, flexWrap: 'wrap' }]}>{errorMessage}</Text></View></ModernCard>}

        {/* Result Card */}
        {!!result && (
          <ModernCard>
            <View style={modernStyles.resultHeaderRow}><Text style={[modernStyles.resultTitle, { color: colors.text, flex: 1, flexWrap: 'wrap' }]}>{result.label}</Text><View style={[modernStyles.confidenceBadge, { backgroundColor: colors.primary + '10' }]}><Text style={[modernStyles.confidenceText, { color: colors.primary }]}>{roundPct(result.confidence)}</Text></View></View>
            <View style={modernStyles.pillsRow}><View style={[modernStyles.pill, { backgroundColor: severityBg ?? colors.primary }]}><Text style={modernStyles.pillText}>{language === 'sinhala' ? (result.severity === 'low' ? 'අඩු' : result.severity === 'medium' ? 'මධ්‍යම' : 'ඉහළ') : language === 'tamil' ? (result.severity === 'low' ? 'குறைவு' : result.severity === 'medium' ? 'நடுத்தர' : 'அதிகம்') : result.severity.toUpperCase()} {language === 'sinhala' ? 'තීව්‍රතාව' : language === 'tamil' ? 'தீவிரம்' : 'severity'}</Text></View><View style={[modernStyles.pillOutline, { borderColor: colors.border }]}><Text style={[modernStyles.pillOutlineText, { color: colors.subtext }]}>{result.kind === 'rash' ? (language === 'sinhala' ? 'රෑෂ්' : language === 'tamil' ? 'ரேஷ்' : 'Rash') : result.kind === 'wound' ? (language === 'sinhala' ? 'තුවාල' : language === 'tamil' ? 'காயம்' : 'Wound') : (language === 'sinhala' ? 'නොදන්නා' : language === 'tamil' ? 'தெரியாது' : 'Unknown')}</Text></View></View>
            <Text style={[modernStyles.resultDetails, { color: colors.subtext, flexWrap: 'wrap' }]}>{result.details}</Text>
            <Text style={[modernStyles.nextTitle, { color: colors.text }]}>{language === 'sinhala' ? 'ඊළඟ පියවර' : language === 'tamil' ? 'அடுத்த படிகள்' : 'Next steps'}</Text>
            {result.nextSteps.map((s, idx) => <View key={idx} style={modernStyles.bulletRow}><Feather name="check-circle" size={16} color={colors.primary} /><Text style={[modernStyles.bulletText, { color: colors.subtext, flex: 1, flexWrap: 'wrap' }]}>{s}</Text></View>)}
          </ModernCard>
        )}

        {/* Doctors Section (unchanged) */}
        {!!result && (
          <ModernCard>
            <SectionHeader title={language === 'sinhala' ? 'ලබා ගත හැකි වෛද්‍යවරු' : language === 'tamil' ? 'கிடைக்கும் மருத்துவர்கள்' : 'Available doctors'} icon={<FontAwesome5 name="user-md" size={20} color={colors.primary} />} />
            {doctorsLoading && <ActivityIndicator style={{ paddingVertical: 10 }} />}
            {!!doctorsError && !doctorsLoading && <Text style={[modernStyles.disclaimer, { color: colors.subtext }]}>{doctorsError}</Text>}
            {!doctorsLoading && !doctorsError && doctors.length === 0 && <Text style={[modernStyles.disclaimer, { color: colors.subtext }]}>{language === 'sinhala' ? 'දත්ත ගබඩාවේ වෛද්‍යවරු නොමැත.' : language === 'tamil' ? 'தரவுத்தளத்தில் மருத்துவர்கள் இல்லை.' : 'No doctors found.'}</Text>}
            {!doctorsLoading && !doctorsError && doctors.map((d, idx) => {
              const name = d.full_name ? `Dr. ${String(d.full_name)}` : `Doctor #${String(d.doctor_id)}`;
              const subParts = [d.specialization ? String(d.specialization) : '', d.qualification ? String(d.qualification) : '', typeof d.consultation_fee === 'number' ? `Fee: ${d.consultation_fee}` : ''].filter(x => x.trim());
              const sub = subParts.join(' • ');
              return (
                <View key={String(d.doctor_id)} style={[modernStyles.listItem, idx !== 0 && { borderTopWidth: 1, borderTopColor: colors.border + '40' }]}>
                  <View style={modernStyles.listIconWrapper}><View style={[modernStyles.listIconBg, { backgroundColor: colors.primary + '10' }]}><FontAwesome5 name="user-md" size={20} color={colors.primary} /></View></View>
                  <View style={modernStyles.listTextContainer}><Text style={[modernStyles.listTitle, { color: colors.text, flexWrap: 'wrap' }]}>{name}</Text>{!!sub && <Text style={[modernStyles.listSub, { color: colors.subtext, flexWrap: 'wrap' }]}>{sub}</Text>}</View>
                  <TouchableOpacity style={[modernStyles.smallButton, { backgroundColor: colors.primary }]}><Text style={modernStyles.smallButtonText}>{language === 'sinhala' ? 'වෙන්කරගන්න' : language === 'tamil' ? 'முன்பதிவு' : 'Book'}</Text></TouchableOpacity>
                </View>
              );
            })}
          </ModernCard>
        )}

        {/* Nearby Section with MapLibre */}
        {!!result && (
          <ModernCard>
            <SectionHeader title={language === 'sinhala' ? 'ආසන්න රෝහල්' : language === 'tamil' ? 'அருகிலுள்ள மருத்துவமனைகள்' : 'Nearby hospitals'} icon={<MaterialCommunityIcons name="hospital-building" size={20} color={colors.primary} />} />
            <TouchableOpacity style={[modernStyles.primaryBtn, { backgroundColor: colors.primary }]} onPress={fetchNearbyCarePlaces} disabled={nearbyLoading}>
              {nearbyLoading ? <ActivityIndicator color="#fff" /> : <><Feather name="map-pin" size={18} color="#fff" /><Text style={modernStyles.primaryBtnText}>{findNearbyLabel}</Text></>}
            </TouchableOpacity>
            {!!nearbyError && !nearbyLoading && <View style={modernStyles.errorContainer}><Ionicons name="warning-outline" size={20} color={colors.danger} /><Text style={[modernStyles.disclaimer, { color: colors.subtext, flex: 1, flexWrap: 'wrap' }]}>{nearbyError}</Text></View>}
            {!!nearbyPlaces && nearbyPlaces.length === 0 && !nearbyLoading && <Text style={[modernStyles.disclaimer, { color: colors.subtext }]}>No nearby places found.</Text>}
            {!!nearbyPlaces && nearbyPlaces.length > 0 && (
              <View>
                {nearbyOrigin && Platform.OS !== 'web' && (
                  <View style={modernStyles.mapContainer}>
                    <View style={[modernStyles.mapWrap, { borderColor: colors.border }]}>
                      <MapLibreView
                        styleUrl={MAPLIBRE_STYLE_STREETS_URL}
                        markers={nearbyMarkers}
                        polyline={null}
                        focus={mapFocus}
                        style={{ flex: 1 }}
                      />
                    </View>
                    <View style={modernStyles.mapControls}>
                      <TouchableOpacity style={[modernStyles.mapControlBtn, { backgroundColor: colors.card }]} onPress={centerOnCurrentLocation}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[modernStyles.mapControlBtn, { backgroundColor: colors.card }]} onPress={() => nearbyPlaces[0] && openStreetViewForPlace(nearbyPlaces[0])}>
                        <MaterialCommunityIcons name="street-view" size={22} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[modernStyles.mapControlBtn, { backgroundColor: colors.card }]} onPress={() => setFullScreenMap(true)}>
                        <Feather name="maximize-2" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {nearbyPlaces.map((p, idx) => (
                  <View key={p.id} style={[modernStyles.listItem, idx !== 0 && modernStyles.listItemSeparator]}>
                    <View style={modernStyles.listIconWrapper}><View style={[modernStyles.listIconBg, { backgroundColor: (colors.info || '#3B82F6') + '10' }]}><MaterialCommunityIcons name="map-marker" size={22} color={colors.info || '#3B82F6'} /></View></View>
                    <View style={modernStyles.listTextContainer}><Text style={[modernStyles.listTitle, { color: colors.text, flexWrap: 'wrap' }]}>{p.name}</Text><Text style={[modernStyles.listSub, { color: colors.subtext, flexWrap: 'wrap' }]}>{p.distanceKm.toFixed(1)} km • {p.category}</Text></View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[modernStyles.smallButtonOutline, { borderColor: colors.primary }]} onPress={() => handleDirectionsPress(p)}><Text style={[modernStyles.smallButtonOutlineText, { color: colors.primary }]}>{language === 'sinhala' ? 'දිශානතිය' : language === 'tamil' ? 'வழிநடத்து' : 'Directions'}</Text></TouchableOpacity>
                      <TouchableOpacity style={[modernStyles.smallButtonOutline, { borderColor: colors.primary }]} onPress={() => openStreetViewForPlace(p)}><MaterialCommunityIcons name="street-view" size={20} color={colors.primary} /></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Text style={[modernStyles.disclaimer, { color: colors.subtext, marginTop: 12 }]}>{language === 'sinhala' ? 'GPS භාවිතා කර ආසන්න ස්ථාන සොයයි (OpenStreetMap දත්ත).' : language === 'tamil' ? 'GPS பயன்படுத்தி அருகிலுள்ள இடங்களை தேடும் (OpenStreetMap தரவு).' : 'Uses GPS to find nearby places (OpenStreetMap data).'}</Text>
          </ModernCard>
        )}
      </ScrollView>

      {/* Full Screen Map Modal */}
      <Modal visible={fullScreenMap} animationType="slide" onRequestClose={() => setFullScreenMap(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
            <TouchableOpacity onPress={() => setFullScreenMap(false)}><Ionicons name="close" size={28} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={centerOnCurrentLocation}><MaterialCommunityIcons name="crosshairs-gps" size={28} color={colors.primary} /></TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <MapLibreView
              styleUrl={MAPLIBRE_STYLE_STREETS_URL}
              markers={nearbyMarkers}
              polyline={null}
              focus={mapFocus}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const modernStyles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, gap: 16, paddingTop: 16 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, flexWrap: 'wrap', flexShrink: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  backText: { fontSize: 14, fontWeight: '500' },
  subtitle: { fontSize: 14, marginBottom: 12, lineHeight: 20, flexWrap: 'wrap' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionButton: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  actionIconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '500', textAlign: 'center', flexWrap: 'wrap' },
  previewCard: { padding: 0, overflow: 'hidden' },
  preview: { width: '100%', height: 220 },
  emptyPreview: { borderRadius: 20, borderWidth: 1, paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyPreviewText: { fontSize: 14, fontWeight: '500', textAlign: 'center', flexWrap: 'wrap' },
  analyzingRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 12 },
  analyzingText: { fontSize: 14, fontWeight: '500' },
  errorCard: { padding: 16 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  resultTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confidenceText: { fontSize: 13, fontWeight: '600' },
  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30 },
  pillText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  pillOutline: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, borderWidth: 1 },
  pillOutlineText: { fontSize: 12, fontWeight: '500' },
  resultDetails: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  nextTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bulletText: { fontSize: 14, lineHeight: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  listItemSeparator: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  listIconWrapper: { width: 44, alignItems: 'center' },
  listIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listTextContainer: { flex: 1, gap: 4 },
  listTitle: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  listSub: { fontSize: 12, lineHeight: 16, color: '#666' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 40, paddingVertical: 12, marginVertical: 8 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', flexWrap: 'wrap' },
  smallButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  smallButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  smallButtonOutline: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  smallButtonOutlineText: { fontSize: 12, fontWeight: '500' },
  mapContainer: { marginTop: 12, position: 'relative', height: 200, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  mapWrap: { flex: 1 },
  mapControls: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 8, zIndex: 10 },
  mapControlBtn: { padding: 10, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  loadingContainer: { paddingVertical: 20, alignItems: 'center' },
  disclaimer: { fontSize: 12, lineHeight: 16, marginTop: 8, textAlign: 'center' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionIcon: { width: 32, alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3, flex: 1, flexWrap: 'wrap' },
});