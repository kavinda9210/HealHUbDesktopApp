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

export type LoginProps = {
  onLogin?: (params: { email: string; password: string }) => void;
  onLoginSuccess?: (auth: { accessToken: string; refreshToken: string; user: any }) => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
};

export default function Login({ onLogin, onLoginSuccess, onForgotPassword, onRegister }: LoginProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const languageLabel = useMemo(() => {
    if (language === 'sinhala') return 'සිංහල';
    if (language === 'tamil') return 'தமிழ்';
    return 'English';
  }, [language]);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'පිවිසෙන්න';
    if (language === 'tamil') return 'உள்நுழை';
    return 'Log in';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'ඔබගේ ගිණුමට පිවිස HealHub භාවිතා කරන්න';
    if (language === 'tamil') return 'உங்கள் கணக்கில் உள்நுழைந்து HealHub பயன்படுத்துங்கள்';
    return 'Sign in to your account to continue';
  }, [language]);

  const emailLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඊමේල්';
    if (language === 'tamil') return 'மின்னஞ்சல்';
    return 'Email';
  }, [language]);

  const passwordLabel = useMemo(() => {
    if (language === 'sinhala') return 'මුරපදය';
    if (language === 'tamil') return 'கடவுச்சொல்';
    return 'Password';
  }, [language]);

  const buttonLabel = useMemo(() => {
    if (language === 'sinhala') return 'පිවිසෙන්න';
    if (language === 'tamil') return 'உள்நுழை';
    return 'Log in';
  }, [language]);

  const hint = useMemo(() => {
    if (language === 'sinhala') return 'තෝරාගත් භාෂාව';
    if (language === 'tamil') return 'தேர்ந்தெடுத்த மொழி';
    return 'Selected language';
  }, [language]);

  const forgotLabel = useMemo(() => {
    if (language === 'sinhala') return 'මුරපදය අමතකද?';
    if (language === 'tamil') return 'கடவுச்சொல் மறந்துவிட்டதா?';
    return 'Forgot password?';
  }, [language]);

  const registerLabel = useMemo(() => {
    if (language === 'sinhala') return 'නව ගිණුමක් සාදන්න';
    if (language === 'tamil') return 'புதிய கணக்கு உருவாக்கு';
    return 'Create an account';
  }, [language]);

  async function submitLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Email is required');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await apiPost<any>('/api/auth/login', {
        email: trimmedEmail,
        password,
      });

      if (!result.ok) {
        const msg =
          (result.data && (result.data.message || result.data.error)) ||
          (result.status === 401
            ? 'Invalid email or password'
            : result.status === 403
              ? 'Please verify your email first'
              : 'Login failed');
        setErrorMessage(String(msg));
        return;
      }

      if (result.data && result.data.success === false) {
        setErrorMessage(String(result.data.message || 'Login failed'));
        return;
      }

      const accessToken = String(result.data?.access_token ?? '');
      const refreshToken = String(result.data?.refresh_token ?? '');
      if (accessToken && refreshToken) {
        onLoginSuccess?.({ accessToken, refreshToken, user: result.data?.user });
      }

      onLogin?.({ email: trimmedEmail, password });
    } catch (e: any) {
      setErrorMessage(e?.message ? String(e.message) : 'Login failed');
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
          <View style={styles.header}>
            <Text style={styles.languagePill}>
              {hint}: {languageLabel}
            </Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{emailLabel}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              textContentType="emailAddress"
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
              textContentType="password"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={submitLogin}
            >
              <Text style={styles.buttonText}>
                {isSubmitting
                  ? language === 'sinhala'
                    ? 'සකසමින්...'
                    : language === 'tamil'
                      ? 'செயலாக்கப்படுகிறது...'
                      : 'Signing in...'
                  : buttonLabel}
              </Text>
            </TouchableOpacity>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={onForgotPassword}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>{forgotLabel}</Text>
              </TouchableOpacity>

              <View style={styles.linkDivider} />

              <TouchableOpacity
                onPress={onRegister}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>{registerLabel}</Text>
              </TouchableOpacity>
            </View>

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
    paddingTop: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  languagePill: {
    color: '#2E8B57',
    backgroundColor: '#f0f9ff',
    borderColor: '#2E8B57',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '600',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
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
  linksRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  linkText: {
    color: '#2E8B57',
    fontWeight: '700',
    fontSize: 13,
  },
  linkDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#cbd5e1',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#b91c1c',
    textAlign: 'center',
    fontWeight: '700',
  },
});
