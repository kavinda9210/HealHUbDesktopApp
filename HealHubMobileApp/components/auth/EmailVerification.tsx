import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../context/LanguageContext';

export type EmailVerificationProps = {
  email?: string;
  onVerify?: (params: { email?: string; code: string }) => void;
  onBack?: () => void;
};

export default function EmailVerification({ email, onVerify, onBack }: EmailVerificationProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ඊමේල් සත්‍යාපනය';
    if (language === 'tamil') return 'மின்னஞ்சல் சரிபார்ப்பு';
    return 'Email verification';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'ඔබගේ ඊමේල් වෙත යවන ලද කේතය ඇතුළත් කරන්න';
    if (language === 'tamil') return 'உங்கள் மின்னஞ்சலுக்கு அனுப்பிய குறியீட்டை உள்ளிடவும்';
    return 'Enter the code sent to your email';
  }, [language]);

  const codeLabel = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපන කේතය';
    if (language === 'tamil') return 'சரிபார்ப்பு குறியீடு';
    return 'Verification code';
  }, [language]);

  const buttonLabel = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපනය කරන්න';
    if (language === 'tamil') return 'சரிபார்க்கவும்';
    return 'Verify';
  }, [language]);

  const backLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආපසු';
    if (language === 'tamil') return 'பின்செல்';
    return 'Back';
  }, [language]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {!!email && <Text style={styles.emailText}>{email}</Text>}

          <View style={styles.card}>
            <Text style={styles.label}>{codeLabel}</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder={language === 'sinhala' ? 'කේතය ඇතුළත් කරන්න' : language === 'tamil' ? 'குறியீட்டை உள்ளிடவும்' : 'Enter code'}
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={() => onVerify?.({ email, code: code.trim() })}
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </TouchableOpacity>

            {!!onBack && (
              <TouchableOpacity
                onPress={onBack}
                activeOpacity={0.7}
                style={styles.backWrap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.backText}>{backLabel}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.footerNote}>
              {language === 'sinhala'
                ? 'මෙය UI පමණි (සත්‍ය ඊමේල් සත්‍යාපනය පසුව එකතු කරමු).'
                : language === 'tamil'
                  ? 'இது UI மட்டும் (உண்மையான மின்னஞ்சல் சரிபார்ப்பை பின்னர் சேர்க்கலாம்).'
                  : 'UI only (we can add real email verification later).'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  emailText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#0f172a',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#2E8B57',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  backWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  backText: {
    color: '#2E8B57',
    fontWeight: '700',
    fontSize: 14,
  },
  footerNote: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
