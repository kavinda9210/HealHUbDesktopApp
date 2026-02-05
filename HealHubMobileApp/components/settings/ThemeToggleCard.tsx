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
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMode('light')}
          style={[
            styles.option,
            {
              borderColor: mode === 'light' ? colors.primary : colors.border,
              backgroundColor: mode === 'light' ? (colors.background === '#ffffff' ? '#f0f9ff' : '#0b2a22') : 'transparent',
            },
          ]}
        >
          <Text style={[styles.optionText, { color: mode === 'light' ? colors.primary : colors.subtext }]}>
            ☀️ {lightLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMode('dark')}
          style={[
            styles.option,
            {
              borderColor: mode === 'dark' ? colors.primary : colors.border,
              backgroundColor: mode === 'dark' ? (colors.background === '#ffffff' ? '#f0f9ff' : '#0b2a22') : 'transparent',
            },
          ]}
        >
          <Text style={[styles.optionText, { color: mode === 'dark' ? colors.primary : colors.subtext }]}>
            🌙 {darkLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.note, { color: colors.subtext }]}>
        {language === 'sinhala'
          ? 'මෙය UI/තේමා ඩෙමෝවක්. වෙනත් තිර වලටත් අවශ්‍ය ලෙස යොදන්න.'
          : language === 'tamil'
            ? 'இது UI/தீம் டெமோ. தேவையான திரைகளில் பயன்படுத்தலாம்.'
            : 'UI/theme demo. Apply to more screens as needed.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '900',
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
