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

export type VerificationProps = {
  email?: string;
  onVerify?: (params: {
    email?: string;
    code: string;
    password: string;
    confirmPassword: string;
  }) => void;
  onBack?: () => void;
};

export default function Verification({ email, onVerify, onBack }: VerificationProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපනය';
    if (language === 'tamil') return 'சரிபார்ப்பு';
    return 'Verification';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'ඔබට ලැබුණු කේතය ඇතුළත් කර නව මුරපදය සකසන්න';
    if (language === 'tamil') return 'பெற்ற குறியீட்டை உள்ளிட்டு புதிய கடவுச்சொல்லை அமைக்கவும்';
    return 'Enter the code you received and set a new password';
  }, [language]);

  const codeLabel = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපන කේතය';
    if (language === 'tamil') return 'சரிபார்ப்பு குறியீடு';
    return 'Verification code';
  }, [language]);

  const passwordLabel = useMemo(() => {
    if (language === 'sinhala') return 'නව මුරපදය';
    if (language === 'tamil') return 'புதிய கடவுச்சொல்';
    return 'New password';
  }, [language]);

  const confirmPasswordLabel = useMemo(() => {
    if (language === 'sinhala') return 'මුරපදය තහවුරු කරන්න';
    if (language === 'tamil') return 'கடவுச்சொல்லை உறுதிப்படுத்து';
    return 'Confirm password';
  }, [language]);

  const buttonLabel = useMemo(() => {
    if (language === 'sinhala') return 'මුරපදය යාවත්කාලීන කරන්න';
    if (language === 'tamil') return 'கடவுச்சொல்லை புதுப்பி';
    return 'Update password';
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
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>{passwordLabel}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              textContentType="newPassword"
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>{confirmPasswordLabel}</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              textContentType="password"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={() => onVerify?.({ email, code: code.trim(), password, confirmPassword })}
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
                ? 'මෙය UI පමණි (සත්‍ය සත්‍යාපනය/මුරපද යාවත්කාලීන කිරීම පසුව එකතු කරමු).'
                : language === 'tamil'
                  ? 'இது UI மட்டும் (உண்மையான சரிபார்ப்பு/கடவுச்சொல் புதுப்பிப்பை பின்னர் சேர்க்கலாம்).'
                  : 'UI only (we can add real verification later).'}
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
