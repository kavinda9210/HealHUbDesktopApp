import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage, Language } from '../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ───────────────────────────────────────────────
const C = {
  green:       '#2E8B57',
  greenDeep:   '#1F6B40',
  greenMid:    '#3A9E66',
  greenTint:   '#E8F5EE',
  greenTint2:  '#D4EDE0',
  greenTint3:  '#F2FAF6',
  white:       '#FFFFFF',
  offWhite:    '#FAFCFB',
  ink:         '#111C16',
  inkMid:      '#2D4035',
  inkLight:    '#6B8577',
  border:      '#D8EDE2',
  borderLight: '#EAF5EF',
  shadow:      'rgba(46,139,87,0.14)',
};

interface LanguageSelectorProps {
  onContinue: () => void;
}

const LanguageSelector = ({ onContinue }: LanguageSelectorProps) => {
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedLang, setSelectedLang] = useState<Language>(language);

  const headerFade        = useRef(new Animated.Value(0)).current;
  const headerSlide       = useRef(new Animated.Value(28)).current;
  const cardAnim0         = useRef(new Animated.Value(0)).current;
  const cardAnim1         = useRef(new Animated.Value(0)).current;
  const cardAnim2         = useRef(new Animated.Value(0)).current;
  const cardAnims         = [cardAnim0, cardAnim1, cardAnim2];
  const ctaFade           = useRef(new Animated.Value(0)).current;
  const orbScale          = useRef(new Animated.Value(1)).current;
  const scrollHintOpacity = useRef(new Animated.Value(0)).current;
  const scrollHintBounce  = useRef(new Animated.Value(0)).current;
  const nudgeFade         = useRef(new Animated.Value(0)).current;
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
    ]).start();

    cardAnims.forEach((a, i) => {
      Animated.sequence([
        Animated.delay(280 + i * 90),
        Animated.spring(a, { toValue: 1, tension: 65, friction: 12, useNativeDriver: true }),
      ]).start();
    });

    Animated.sequence([
      Animated.delay(600),
      Animated.timing(ctaFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.12, duration: 3000, useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1,    duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    // Scroll hint fades in after cards appear, then loops a bounce
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(scrollHintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scrollHintBounce, { toValue: 7,  duration: 650, useNativeDriver: true }),
        Animated.timing(scrollHintBounce, { toValue: 0,  duration: 650, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const languages: {
    code: Language;
    nativeName: string;
    latinName: string;
    flag: string;
    tagline: string;
  }[] = [
    { code: 'english', nativeName: 'English', latinName: 'English', flag: '🇬🇧', tagline: 'Your health companion'    },
    { code: 'sinhala', nativeName: 'සිංහල',   latinName: 'Sinhala', flag: '🇱🇰', tagline: 'ඔබගේ සෞඛ්‍ය සහයක'     },
    { code: 'tamil',   nativeName: 'தமிழ்',   latinName: 'Tamil',   flag: '🇮🇳', tagline: 'உங்கள் சுகாதார துணை'    },
  ];

  const getTitle = () => {
    if (selectedLang === 'sinhala') return 'ඔබගේ භාෂාව\nතෝරන්න';
    if (selectedLang === 'tamil')   return 'மொழியைத்\nதேர்ந்தெடுக்கவும்';
    return 'Choose Your\nLanguage';
  };

  const getContinue = () => {
    if (selectedLang === 'sinhala') return 'කරගෙන යන්න';
    if (selectedLang === 'tamil')   return 'தொடரவும்';
    return 'Continue';
  };

  const getNote = () => {
    if (selectedLang === 'sinhala') return 'ඔබට පසුව භාෂාව වෙනස් කළ හැකිය';
    if (selectedLang === 'tamil')   return 'பின்னர் மொழியை மாற்றலாம்';
    return 'You can change this anytime in settings';
  };

  const handleContinue = () => {
    setLanguage(selectedLang);
    onContinue();
  };

  const handleScroll = (e: any) => {
    if (!hasScrolled && e.nativeEvent.contentOffset.y > 20) {
      setHasScrolled(true);
      Animated.timing(scrollHintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  const handleSelectLang = (lang: Language) => {
    setSelectedLang(lang);
    // Show "now tap continue" nudge after first selection
    Animated.sequence([
      Animated.timing(nudgeFade, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(150),
      Animated.timing(nudgeFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.offWhite} translucent={false} />

      {/* Soft background orbs */}
      <Animated.View style={[styles.bgOrb1, { transform: [{ scale: orbScale }] }]} />
      <View style={styles.bgOrb2} />

      {/* Top accent bar */}
      <View style={styles.topBar} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 24) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <Animated.View
          style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
        >
          {/* Brand chip */}
          <View style={styles.brandChip}>
            <View style={styles.brandDot} />
            <Text style={styles.brandLabel}>HealHub</Text>
          </View>

          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>
            {selectedLang === 'sinhala'
              ? 'ඔබේ කැමති භාෂාව තෝරා ගැනීමෙන්\nසම්පූර්ණ අත්දැකීමක් ලබා ගන්න'
              : selectedLang === 'tamil'
              ? 'உங்கள் மொழியில் சிறந்த\nசுகாதார அனுபவம் பெறுங்கள்'
              : 'Select your language for a fully\npersonalised health experience'}
          </Text>
        </Animated.View>

        {/* ── Section label ─────────────────────────────────── */}
        <Animated.View style={[styles.sectionRow, { opacity: ctaFade }]}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionLabel}>SELECT ONE</Text>
          <View style={styles.sectionLine} />
        </Animated.View>

        {/* ── Language Cards ────────────────────────────────── */}
        <View style={styles.cardList}>
          {languages.map((lang, i) => {
            const isSelected = selectedLang === lang.code;
            return (
              <Animated.View
                key={lang.code}
                style={{
                  opacity: cardAnims[i],
                  transform: [{
                    translateY: cardAnims[i].interpolate({
                      inputRange:  [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                }}
              >
                <TouchableOpacity
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => handleSelectLang(lang.code)}
                  activeOpacity={0.72}
                >
                  <View style={[styles.flagBox, isSelected && styles.flagBoxSelected]}>
                    <Text style={styles.flagEmoji}>{lang.flag}</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={[styles.cardNative, isSelected && styles.cardNativeSelected]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.cardTagline, isSelected && styles.cardTaglineSelected]}>
                      {lang.tagline}
                    </Text>
                  </View>

                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Post-select nudge ────────────────────────────── */}
        <Animated.View style={[styles.nudgeRow, { opacity: nudgeFade }]} pointerEvents="none">
          <View style={styles.nudgeLine} />
          <View style={styles.nudgePill}>
            <Text style={styles.nudgeArrow}>↓</Text>
            <Text style={styles.nudgeText}>
              {selectedLang === 'sinhala' ? 'දිගටම යාමට පහතට අනුචලනය කරන්න' :
               selectedLang === 'tamil'   ? 'தொடர கீழே உருட்டவும்' :
               'Scroll down to continue'}
            </Text>
          </View>
          <View style={styles.nudgeLine} />
        </Animated.View>

        {/* ── CTA ───────────────────────────────────────────── */}
        <Animated.View style={{ opacity: ctaFade }}>
          <TouchableOpacity
            style={[styles.ctaBtn, !selectedLang && styles.ctaDisabled]}
            onPress={handleContinue}
            activeOpacity={0.82}
            disabled={!selectedLang}
          >
            <Text style={styles.ctaLabel}>{getContinue()}</Text>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.note}>{getNote()}</Text>
        </Animated.View>
      </ScrollView>
      {/* ── Floating scroll hint (fades out on scroll) ──── */}
      <Animated.View
        style={[styles.scrollHint, { opacity: scrollHintOpacity }]}
        pointerEvents="none"
      >
        <Animated.View style={{ transform: [{ translateY: scrollHintBounce }] }}>
          <View style={styles.scrollHintInner}>
            <Text style={styles.scrollHintText}>
              {selectedLang === 'sinhala' ? 'භාෂාව තෝරා පහතට අනුචලනය කරන්න' :
               selectedLang === 'tamil'   ? 'மொழி தேர்ந்தெடுத்து கீழே உருட்டவும்' :
               'Select a language & scroll down'}
            </Text>
            <Text style={styles.scrollHintChevron}>⌄</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.offWhite,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999,
  },

  // ─── Background ──────────────────────────────────────────────
  bgOrb1: {
    position: 'absolute',
    top: -130,
    right: -110,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.greenTint,
    opacity: 0.65,
  },
  bgOrb2: {
    position: 'absolute',
    bottom: 60,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: C.greenTint,
    opacity: 0.45,
  },
  topBar: {
    height: 4,
    backgroundColor: C.green,
  },

  // ─── Scroll ──────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  // ─── Header ──────────────────────────────────────────────────
  header: {
    marginBottom: 28,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.greenTint2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
    marginRight: 7,
  },
  brandLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.greenDeep,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },

  // Icon cluster
  iconCluster: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 28,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 5,
  },
  iconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSymbol: {
    fontSize: 22,
    color: C.green,
  },
  orbitDot: {
    position: 'absolute',
    borderRadius: 10,
  },
  od1: { top: -3,  right: 2,  width: 11, height: 11, backgroundColor: C.green,     opacity: 0.65 },
  od2: { bottom: 1, right: -4, width: 7,  height: 7,  backgroundColor: C.greenMid, opacity: 0.4  },
  od3: { top: 22,  right: -9, width: 8,  height: 8,  backgroundColor: C.greenTint2, borderWidth: 1.5, borderColor: C.border },

  title: {
    fontSize: 40,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: C.inkLight,
    lineHeight: 24,
    fontWeight: '400',
  },

  // ─── Section Row ─────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkLight,
    letterSpacing: 1.4,
  },

  // ─── Cards ───────────────────────────────────────────────────
  cardList: {
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: C.borderLight,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: C.green,
    shadowColor: C.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },

  flagBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: C.greenTint3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  flagBoxSelected: {
    backgroundColor: C.greenTint,
    borderColor: C.border,
  },
  flagEmoji: {
    fontSize: 26,
  },

  cardBody: {
    flex: 1,
  },
  cardNative: {
    fontSize: 20,
    fontWeight: '700',
    color: C.inkMid,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardNativeSelected: {
    color: C.greenDeep,
  },
  cardTagline: {
    fontSize: 13,
    color: C.inkLight,
    fontWeight: '400',
  },
  cardTaglineSelected: {
    color: C.greenMid,
  },

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: C.green,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.green,
  },

  // ─── CTA ─────────────────────────────────────────────────────
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.green,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 12,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 7,
    marginBottom: 18,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.1,
  },
  ctaPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrow: {
    fontSize: 22,
    color: C.white,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -1,
  },

  note: {
    textAlign: 'center',
    color: C.inkLight,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 8,
  },

  // ─── Post-select nudge ───────────────────────────────────────
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  nudgeLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  nudgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenTint,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    gap: 6,
  },
  nudgeArrow: {
    fontSize: 13,
    color: C.green,
    fontWeight: '700',
  },
  nudgeText: {
    fontSize: 12,
    color: C.greenDeep,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ─── Floating scroll hint ────────────────────────────────────
  scrollHint: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scrollHintInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 8,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  scrollHintText: {
    fontSize: 13,
    color: C.inkMid,
    fontWeight: '500',
  },
  scrollHintChevron: {
    fontSize: 18,
    color: C.green,
    fontWeight: '700',
    lineHeight: 20,
  },
});

export default LanguageSelector;