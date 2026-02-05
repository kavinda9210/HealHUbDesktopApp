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

export type ForgotPasswordProps = {
  onSendVerification?: (email: string) => void;
  onBack?: () => void;
};

export default function ForgotPassword({ onSendVerification, onBack }: ForgotPasswordProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'මුරපදය අමතකද?';
    if (language === 'tamil') return 'கடவுச்சொல் மறந்துவிட்டதா?';
    return 'Forgot password';
  }, [language]);

  const emailLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඊමේල්';
    if (language === 'tamil') return 'மின்னஞ்சல்';
    return 'Email';
  }, [language]);

  const buttonLabel = useMemo(() => {
    if (language === 'sinhala') return 'සත්‍යාපන කේතය යවන්න';
    if (language === 'tamil') return 'சரிபார்ப்பு குறியீட்டை அனுப்பு';
    return 'Send verification';
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
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={() => onSendVerification?.(email.trim())}
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
  backWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  backText: {
    color: '#2E8B57',
    fontWeight: '700',
    fontSize: 14,
  },
});
