import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLanguage, Language } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function LanguagePickerInline() {
  const { language, setLanguage } = useLanguage();
  const { colors } = useTheme();

  const title = useMemo(() => {
    if (language === 'sinhala') return 'භාෂාව';
    if (language === 'tamil') return 'மொழி';
    return 'Language';
  }, [language]);

  const options: Array<{ key: Language; label: string }> = [
    { key: 'english', label: 'English' },
    { key: 'sinhala', label: 'සිංහල' },
    { key: 'tamil', label: 'தமிழ்' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.row}>
        {options.map((o) => {
          const active = o.key === language;
          return (
            <TouchableOpacity
              key={o.key}
              onPress={() => setLanguage(o.key)}
              activeOpacity={0.85}
              style={[
                styles.pill,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? (colors.background === '#ffffff' ? '#f0f9ff' : '#0b2a22') : 'transparent',
                },
              ]}
            >
              <Text style={[styles.pillText, { color: active ? colors.primary : colors.subtext }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
