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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

type IntroSlidesProps = {
  onDone: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  key: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
};

const IntroSlides: React.FC<IntroSlidesProps> = ({ onDone }) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide> | null>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: 'medicine',
        icon: '💊',
        titleKey: 'intro_medicine_title',
        descriptionKey: 'intro_medicine_desc',
      },
      {
        key: 'rash',
        icon: '🧠',
        titleKey: 'intro_rash_title',
        descriptionKey: 'intro_rash_desc',
      },
      {
        key: 'ambulance',
        icon: '🚑',
        titleKey: 'intro_ambulance_title',
        descriptionKey: 'intro_ambulance_desc',
      },
    ],
    [],
  );

  const isLast = index === slides.length - 1;

  const scrollTo = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    listRef.current?.scrollToOffset({ offset: safeIndex * SCREEN_WIDTH, animated: true });
    setIndex(safeIndex);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(nextIndex);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.brand}>HealHub</Text>
        {!isLast ? (
          <TouchableOpacity onPress={onDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skip}>{t('skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        ref={(r) => {
          listRef.current = r;
        }}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.desc}>{t(item.descriptionKey)}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(18, insets.bottom + 12) }]}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => scrollTo(index - 1)}
            disabled={index === 0}
            style={[styles.secondaryButton, index === 0 && styles.secondaryButtonDisabled]}
          >
            <Text style={[styles.secondaryButtonText, index === 0 && styles.secondaryButtonTextDisabled]}>
              {t('intro_back')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (isLast) {
                onDone();
              } else {
                scrollTo(index + 1);
              }
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {isLast ? t('intro_get_started') : t('next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E8B57',
  },
  skip: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E8B57',
  },
  slide: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 10,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#2E8B57',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  secondaryButtonTextDisabled: {
    color: '#6B7280',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2E8B57',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default IntroSlides;
