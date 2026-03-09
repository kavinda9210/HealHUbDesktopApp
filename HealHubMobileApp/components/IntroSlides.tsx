import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

type IntroSlidesProps = {
  onDone: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Slide = {
  key: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  accent: string;
  tag: string;
};

const IntroSlides: React.FC<IntroSlidesProps> = ({ onDone }) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide> | null>(null);
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;

  const slides: Slide[] = useMemo(
    () => [
      {
        key: 'medicine',
        icon: '💊',
        titleKey: 'intro_medicine_title',
        descriptionKey: 'intro_medicine_desc',
        accent: '#C8F0DA',
        tag: '01',
      },
      {
        key: 'rash',
        icon: '🧠',
        titleKey: 'intro_rash_title',
        descriptionKey: 'intro_rash_desc',
        accent: '#B8EBD0',
        tag: '02',
      },
      {
        key: 'ambulance',
        icon: '🚑',
        titleKey: 'intro_ambulance_title',
        descriptionKey: 'intro_ambulance_desc',
        accent: '#A8E6C5',
        tag: '03',
      },
    ],
    [],
  );

  const isLast = index === slides.length - 1;

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.4,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: -12,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex(nextIndex);
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(slideUpAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    });
  };

  const scrollTo = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    listRef.current?.scrollToOffset({ offset: safeIndex * SCREEN_WIDTH, animated: true });
    animateTransition(safeIndex);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (nextIndex !== index) animateTransition(nextIndex);
  };

  const currentSlide = slides[index];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Decorative background blobs */}
      <View style={[styles.blobTopRight, { backgroundColor: currentSlide.accent }]} />
      <View style={[styles.blobBottomLeft, { backgroundColor: currentSlide.accent }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <View style={styles.logoDot} />
          <Text style={styles.brand}>HealHub</Text>
        </View>
        {!isLast ? (
          <TouchableOpacity
            onPress={onDone}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.skipButton}
          >
            <Text style={styles.skip}>{t('skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {/* Slide counter */}
      <Animated.View
        style={[
          styles.counterRow,
          { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] },
        ]}
      >
        <Text style={styles.counterActive}>{currentSlide.tag}</Text>
        <Text style={styles.counterSeparator}> / </Text>
        <Text style={styles.counterTotal}>0{slides.length}</Text>
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={(r) => { listRef.current = r; }}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Large icon card */}
            <View style={styles.iconCard}>
              <View style={[styles.iconRing, { borderColor: item.accent }]}>
                <View style={[styles.iconInner, { backgroundColor: item.accent }]}>
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
              </View>
              {/* Decorative corner mark */}
              <View style={styles.cardCornerTL} />
              <View style={styles.cardCornerBR} />
            </View>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
                alignItems: 'center',
              }}
            >
              <Text style={styles.title}>{t(item.titleKey)}</Text>
              <Text style={styles.desc}>{t(item.descriptionKey)}</Text>
            </Animated.View>
          </View>
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        {/* Progress track */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${((index + 1) / slides.length) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <TouchableOpacity key={s.key} onPress={() => scrollTo(i)}>
              <View style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => scrollTo(index - 1)}
            disabled={index === 0}
            style={[styles.backButton, index === 0 && styles.backButtonDisabled]}
          >
            <Text style={[styles.backArrow, index === 0 && styles.backArrowDisabled]}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { isLast ? onDone() : scrollTo(index + 1); }}
            style={styles.primaryButton}
            activeOpacity={0.88}
          >
            <View style={styles.primaryButtonInner}>
              <Text style={styles.primaryButtonText}>
                {isLast ? t('intro_get_started') : t('next')}
              </Text>
              {!isLast && <Text style={styles.primaryButtonArrow}>→</Text>}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  /* Background decorations */
  blobTopRight: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: SCREEN_WIDTH * 0.36,
    top: -SCREEN_WIDTH * 0.22,
    right: -SCREEN_WIDTH * 0.22,
    opacity: 0.45,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55,
    borderRadius: SCREEN_WIDTH * 0.275,
    bottom: -SCREEN_WIDTH * 0.18,
    left: -SCREEN_WIDTH * 0.18,
    opacity: 0.3,
  },

  /* Header */
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#2E8B57',
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D1B12',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  skip: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },

  /* Slide counter */
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    marginTop: 14,
    marginBottom: 4,
  },
  counterActive: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2E8B57',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: -1,
  },
  counterSeparator: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '300',
    marginHorizontal: 2,
  },
  counterTotal: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Slides */
  slide: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  iconCard: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    maxWidth: 280,
    maxHeight: 280,
    borderRadius: 36,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#2E8B57',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 28,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardCornerTL: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 18,
    height: 18,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: '#2E8B57',
    borderTopLeftRadius: 6,
    opacity: 0.5,
  },
  cardCornerBR: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 18,
    height: 18,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#2E8B57',
    borderBottomRightRadius: 6,
    opacity: 0.5,
  },
  iconRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  iconInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0D1B12',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    paddingHorizontal: 8,
  },
  desc: {
    fontSize: 15.5,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 10,
    letterSpacing: 0.1,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E8B57',
    borderRadius: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2E8B57',
  },

  /* Controls */
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButtonDisabled: {
    opacity: 0.3,
  },
  backArrow: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '300',
  },
  backArrowDisabled: {
    color: '#D1D5DB',
  },
  primaryButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#2E8B57',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#2E8B57',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  primaryButtonArrow: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '300',
  },
});

export default IntroSlides;