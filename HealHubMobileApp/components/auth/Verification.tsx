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
import { apiPost } from '../../utils/api';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  function passwordLooksValid(value: string) {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  }

  async function submit() {
    const trimmedEmail = (email ?? '').trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail) {
      setErrorMessage('Email is missing');
      return;
    }
    if (!trimmedCode) {
      setErrorMessage('Verification code is required');
      return;
    }
    if (!passwordLooksValid(password)) {
      setErrorMessage('Password must be 8+ chars with uppercase, lowercase, and a digit');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await apiPost<any>('/api/auth/reset-password', {
        email: trimmedEmail,
        verification_code: trimmedCode,
        new_password: password,
        confirm_password: confirmPassword,
      });

      if (!result.ok) {
        const msg =
          (result.data && (result.data.message || result.data.error)) ||
          (result.status === 400 ? 'Invalid or expired code' : 'Password reset failed');
        setErrorMessage(String(msg));
        return;
      }

      if (result.data && result.data.success === false) {
        setErrorMessage(String(result.data.message || 'Password reset failed'));
        return;
      }

      onVerify?.({ email: trimmedEmail, code: trimmedCode, password, confirmPassword });
    } catch (e: any) {
      setErrorMessage(e?.message ? String(e.message) : 'Password reset failed');
    } finally {
      setIsSubmitting(false);
    }
  }

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
              disabled={isSubmitting}
              onPress={submit}
            >
              <Text style={styles.buttonText}>
                {isSubmitting
                  ? language === 'sinhala'
                    ? 'සකසමින්...'
                    : language === 'tamil'
                      ? 'செயலாக்கப்படுகிறது...'
                      : 'Updating...'
                  : buttonLabel}
              </Text>
            </TouchableOpacity>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

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
  errorText: {
    marginTop: 12,
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
