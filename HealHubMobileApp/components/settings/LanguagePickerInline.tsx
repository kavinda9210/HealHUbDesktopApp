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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🌐 {title}</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{language === 'sinhala' ? 'භාෂා තෝරන්න' : language === 'tamil' ? 'மொழியைத் தேர்வு செய்யவும்' : 'Select your language'}</Text>
      </View>
      <View style={styles.row}>
        {options.map((o) => {
          const active = o.key === language;
          return (
            <TouchableOpacity
              key={o.key}
              onPress={() => setLanguage(o.key)}
              activeOpacity={0.75}
              style={[
                styles.pill,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + '15' : colors.background,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: active ? colors.primary : colors.subtext, fontWeight: active ? '700' : '600' }]}>{o.label}</Text>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
