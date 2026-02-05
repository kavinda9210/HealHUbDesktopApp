import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

type Props = {
  pendingEmail: string;
  onVerified: () => void;
  onCancel?: () => void;
};

export default function EmailChangeVerificationCard({ pendingEmail, onVerified, onCancel }: Props) {
  const { language } = useLanguage();
  const { colors } = useTheme();

  const [code, setCode] = useState('');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'නව ඊමේල් සත්‍යාපනය';
    if (language === 'tamil') return 'புதிய மின்னஞ்சல் சரிபார்ப்பு';
    return 'Verify new email';
  }, [language]);

  const label = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපන කේතය';
    if (language === 'tamil') return 'சரிபார்ப்பு குறியீடு';
    return 'Verification code';
  }, [language]);

  const verifyLabel = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපනය කරන්න';
    if (language === 'tamil') return 'சரிபார்க்கவும்';
    return 'Verify';
  }, [language]);

  const cancelLabel = useMemo(() => {
    if (language === 'sinhala') return 'අවලංගු';
    if (language === 'tamil') return 'ரத்து';
    return 'Cancel';
  }, [language]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: colors.subtext }]}>{pendingEmail}</Text>

      <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{label}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder={language === 'sinhala' ? 'කේතය' : language === 'tamil' ? 'குறியீடு' : 'Code'}
        placeholderTextColor={colors.subtext}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]} 
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={() => {
            // UI only: accept any non-empty code
            if (code.trim().length > 0) onVerified();
          }}
        >
          <Text style={styles.primaryText}>{verifyLabel}</Text>
        </TouchableOpacity>

        {!!onCancel && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={onCancel}
          >
            <Text style={[styles.secondaryText, { color: colors.subtext }]}>{cancelLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.note, { color: colors.subtext }]}>
        {language === 'sinhala'
          ? 'සටහන: මෙය UI පමණි. පසුව API/OTP සත්‍යාපනය එක් කළ හැක.'
          : language === 'tamil'
            ? 'குறிப்பு: இது UI மட்டும். பின்னர் OTP/API சேர்க்கலாம்.'
            : 'Note: UI only. We can add OTP/API later.'}
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
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '900',
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
