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

export type RegisterProps = {
  onRegister?: (params: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => void;
  onBack?: () => void;
};

export default function Register({ onRegister, onBack }: RegisterProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ලියාපදිංචි වන්න';
    if (language === 'tamil') return 'பதிவு செய்';
    return 'Register';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'නව ගිණුමක් සාදා HealHub භාවිතා කරන්න';
    if (language === 'tamil') return 'புதிய கணக்கை உருவாக்கி HealHub பயன்படுத்துங்கள்';
    return 'Create a new account to get started';
  }, [language]);

  const nameLabel = useMemo(() => {
    if (language === 'sinhala') return 'නම';
    if (language === 'tamil') return 'பெயர்';
    return 'Name';
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

  const confirmPasswordLabel = useMemo(() => {
    if (language === 'sinhala') return 'මුරපදය තහවුරු කරන්න';
    if (language === 'tamil') return 'கடவுச்சொல்லை உறுதிப்படுத்து';
    return 'Confirm password';
  }, [language]);

  const buttonLabel = useMemo(() => {
    if (language === 'sinhala') return 'ගිණුම සාදන්න';
    if (language === 'tamil') return 'கணக்கை உருவாக்கு';
    return 'Create account';
  }, [language]);

  const backLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආපසු';
    if (language === 'tamil') return 'பின்செல்';
    return 'Back';
  }, [language]);

  const loginLinkLabel = useMemo(() => {
    if (language === 'sinhala') return 'දැනටමත් ගිණුමක් තිබේද? පිවිසෙන්න';
    if (language === 'tamil') return 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழை';
    return 'Already have an account? Log in';
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

          <View style={styles.card}>
            <Text style={styles.label}>{nameLabel}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={language === 'sinhala' ? 'ඔබගේ නම' : language === 'tamil' ? 'உங்கள் பெயர்' : 'Your name'}
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              returnKeyType="next"
              textContentType="name"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>{emailLabel}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              returnKeyType="next"
              textContentType="emailAddress"
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
              returnKeyType="next"
              textContentType="newPassword"
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
              returnKeyType="done"
              textContentType="password"
            />

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={() =>
                onRegister?.({
                  name: name.trim(),
                  email: email.trim(),
                  password,
                  confirmPassword,
                })
              }
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </TouchableOpacity>

            {!!onBack && (
              <TouchableOpacity
                onPress={onBack}
                activeOpacity={0.7}
                style={styles.loginLinkWrap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.loginLinkText}>{loginLinkLabel}</Text>
              </TouchableOpacity>
            )}

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
                ? 'මෙය UI පමණි (සත්‍ය ලියාපදිංචිය පසුව එකතු කරමු).'
                : language === 'tamil'
                  ? 'இது UI மட்டும் (உண்மையான பதிவை பின்னர் சேர்க்கலாம்).'
                  : 'UI only (we can add real registration later).'}
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
    marginBottom: 16,
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
  loginLinkWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#2E8B57',
    fontWeight: '800',
    fontSize: 14,
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
