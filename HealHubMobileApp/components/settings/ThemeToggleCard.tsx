import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ThemeToggleCard() {
  const { mode, setMode, colors } = useTheme();
  const { language } = useLanguage();

  const title = useMemo(() => {
    if (language === 'sinhala') return 'තේමාව';
    if (language === 'tamil') return 'தீம்';
    return 'Theme';
  }, [language]);

  const lightLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආලෝක';
    if (language === 'tamil') return 'ஒளி';
    return 'Light';
  }, [language]);

  const darkLabel = useMemo(() => {
    if (language === 'sinhala') return 'අඳුරු';
    if (language === 'tamil') return 'இருள்';
    return 'Dark';
  }, [language]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🎨 {title}</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{language === 'sinhala' ? 'ඔබේ තේමාව තෝරන්න' : language === 'tamil' ? 'உங்கள் தீம் தேர்வு செய்யவும்' : 'Choose your theme'}</Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setMode('light')}
          style={[
            styles.option,
            {
              borderColor: mode === 'light' ? colors.primary : colors.border,
              backgroundColor: mode === 'light' ? colors.primary + '15' : colors.background,
            },
          ]}
        >
          <Text style={[styles.emoji]}>☀️</Text>
          <Text style={[styles.optionText, { color: mode === 'light' ? colors.primary : colors.subtext, fontWeight: mode === 'light' ? '700' : '600' }]}>
            {lightLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setMode('dark')}
          style={[
            styles.option,
            {
              borderColor: mode === 'dark' ? colors.primary : colors.border,
              backgroundColor: mode === 'dark' ? colors.primary + '15' : colors.background,
            },
          ]}
        >
          <Text style={[styles.emoji]}>🌙</Text>
          <Text style={[styles.optionText, { color: mode === 'dark' ? colors.primary : colors.subtext, fontWeight: mode === 'dark' ? '700' : '600' }]}>
            {darkLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});