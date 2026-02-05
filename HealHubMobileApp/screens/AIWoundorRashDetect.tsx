import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type AIWoundorRashDetectProps = {
  onBack?: () => void;
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

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  eta: string;
};

type Hospital = {
  id: string;
  name: string;
  distanceKm: number;
  openNow: boolean;
};

const roundPct = (value: number) => `${Math.round(value * 100)}%`;

function buildFakeResult(uri: string): DetectionResult {
  const lowered = uri.toLowerCase();
  let kind: DetectionKind = 'unknown';
  if (lowered.includes('rash') || lowered.includes('skin') || lowered.includes('eczema')) kind = 'rash';
  if (lowered.includes('wound') || lowered.includes('cut') || lowered.includes('injury') || lowered.includes('burn')) kind = 'wound';

  const confidence = kind === 'unknown' ? 0.55 : 0.86;
  const severity: DetectionResult['severity'] = kind === 'wound' ? 'medium' : kind === 'rash' ? 'low' : 'medium';

  if (kind === 'rash') {
    return {
      kind,
      label: 'Skin rash (possible irritation/allergy)',
      confidence,
      severity,
      details:
        'The image looks consistent with a superficial skin rash. This is not a medical diagnosis. If symptoms worsen, consult a clinician.',
      nextSteps: [
        'Keep the area clean and dry',
        'Avoid scratching; consider a cold compress',
        'If swelling, fever, pain, or spreading occurs, seek medical care',
      ],
    };
  }

  if (kind === 'wound') {
    return {
      kind,
      label: 'Wound/skin injury (needs care)',
      confidence,
      severity,
      details:
        'The image looks consistent with a wound or skin injury. This is not a medical diagnosis. If bleeding, severe pain, or signs of infection appear, seek urgent help.',
      nextSteps: [
        'Rinse gently with clean water',
        'Cover with a clean dressing',
        'Watch for redness, warmth, pus, or increasing pain',
      ],
    };
  }

  return {
    kind,
    label: 'Unable to classify confidently',
    confidence,
    severity: 'medium',
    details:
      'The selected image could not be classified confidently. Try taking a clearer photo in good lighting and ensure the area is in focus.',
    nextSteps: ['Retake the photo with better lighting', 'Try a closer image (in focus)', 'If concerned, consult a clinician'],
  };
}

function buildDoctors(kind: DetectionKind): Doctor[] {
  if (kind === 'wound') {
    return [
      { id: 'd1', name: 'Dr. Jayasinghe', specialty: 'General Practice', rating: 4.7, eta: 'Today' },
      { id: 'd2', name: 'Dr. Perera', specialty: 'Wound Care', rating: 4.6, eta: 'Tomorrow' },
      { id: 'd3', name: 'Dr. Silva', specialty: 'Emergency Medicine', rating: 4.5, eta: 'Now' },
    ];
  }
  if (kind === 'rash') {
    return [
      { id: 'd1', name: 'Dr. Fernando', specialty: 'Dermatology', rating: 4.8, eta: 'Today' },
      { id: 'd2', name: 'Dr. Kumari', specialty: 'Dermatology', rating: 4.6, eta: 'Tomorrow' },
      { id: 'd3', name: 'Dr. Jayasinghe', specialty: 'General Practice', rating: 4.7, eta: 'Today' },
    ];
  }
  return [
    { id: 'd1', name: 'Dr. Jayasinghe', specialty: 'General Practice', rating: 4.7, eta: 'Today' },
    { id: 'd2', name: 'Dr. Fernando', specialty: 'Dermatology', rating: 4.8, eta: 'Tomorrow' },
  ];
}

function buildHospitals(): Hospital[] {
  return [
    { id: 'h1', name: 'City General Hospital', distanceKm: 2.1, openNow: true },
    { id: 'h2', name: 'HealHub Care Center', distanceKm: 3.7, openNow: true },
    { id: 'h3', name: 'Community Clinic', distanceKm: 5.4, openNow: false },
  ];
}

export default function AIWoundorRashDetect({ onBack }: AIWoundorRashDetectProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

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

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    });

    if (picked.canceled) return;

    const uri = picked.assets?.[0]?.uri;
    if (!uri) return;

    await runAnalysis(uri);
  };

  const handleTakePhoto = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) return;

    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    });

    if (shot.canceled) return;

    const uri = shot.assets?.[0]?.uri;
    if (!uri) return;

    await runAnalysis(uri);
  };

  const runAnalysis = async (uri: string) => {
    setImageUri(uri);
    setResult(null);
    setIsAnalyzing(true);

    // UI-only demo: simulate network/model time
    await new Promise((r) => setTimeout(r, 900));

    const fake = buildFakeResult(uri);
    setResult(fake);
    setIsAnalyzing(false);
  };

  const doctors = useMemo(() => buildDoctors(result?.kind ?? 'unknown'), [result?.kind]);
  const hospitals = useMemo(() => buildHospitals(), []);

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
            {doctors.map((d) => (
              <View key={d.id} style={[styles.rowItem, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{d.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.subtext }]}>
                    {d.specialty} • ⭐ {d.rating.toFixed(1)} • {d.eta}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.smallButton, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
                  <Text style={styles.smallButtonText}>
                    {language === 'sinhala' ? 'වෙන්කරගන්න' : language === 'tamil' ? 'முன்பதிவு' : 'Book'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {!!result && (
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{hospitalsTitle}</Text>
            {hospitals.map((h) => (
              <View key={h.id} style={[styles.rowItem, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{h.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.subtext }]}>
                    {h.distanceKm.toFixed(1)} km • {h.openNow ? (language === 'sinhala' ? 'විවෘතයි' : language === 'tamil' ? 'திறந்துள்ளது' : 'Open') : (language === 'sinhala' ? 'වසා ඇත' : language === 'tamil' ? 'மூடப்பட்டுள்ளது' : 'Closed')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.smallButtonOutline, { backgroundColor: colors.background, borderColor: colors.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.smallButtonOutlineText, { color: colors.primary }]}>
                    {language === 'sinhala' ? 'දිශානතිය' : language === 'tamil' ? 'வழிநடத்து' : 'Directions'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.disclaimer, { color: colors.subtext }]}>
              {language === 'sinhala'
                ? 'සටහන: “ආසන්න” ලැයිස්තුව UI ඩෙමෝ එකක්. පසුව ස්ථානය (GPS) මත පදනම් කර ගන්න පුළුවන්.'
                : language === 'tamil'
                  ? 'குறிப்பு: “அருகில்” பட்டியல் UI டெமோ. பின்னர் GPS அடிப்படையில் மாற்றலாம்.'
                  : 'Note: “Nearby” list is a UI demo. We can power this with GPS later.'}
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
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
