import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../context/LanguageContext';
import { apiPost } from '../../utils/api';

export type RegisterProps = {
  onRegistered?: (email: string) => void;
  onBack?: () => void;
};

type GenderValue = 'Male' | 'Female' | 'Other';

export default function Register({ onRegistered, onBack }: RegisterProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [dobDateValue, setDobDateValue] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState<GenderValue | ''>('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
    if (language === 'sinhala') return 'සම්පූර්ණ නම';
    if (language === 'tamil') return 'முழு பெயர்';
    return 'Full name';
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
    if (step < 3) {
      if (language === 'sinhala') return 'ඊළඟට';
      if (language === 'tamil') return 'அடுத்து';
      return 'Next';
    }
    if (isSubmitting) {
      if (language === 'sinhala') return 'සකසමින්...';
      if (language === 'tamil') return 'செயலாக்கப்படுகிறது...';
      return 'Creating...';
    }
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

  const phoneLabel = useMemo(() => {
    if (language === 'sinhala') return 'දුරකථන අංකය';
    if (language === 'tamil') return 'தொலைபேசி எண்';
    return 'Phone number';
  }, [language]);

  const dobLabel = useMemo(() => {
    if (language === 'sinhala') return 'උපන් දිනය (YYYY-MM-DD)';
    if (language === 'tamil') return 'பிறந்த நாள் (YYYY-MM-DD)';
    return 'Date of birth (YYYY-MM-DD)';
  }, [language]);

  const genderLabel = useMemo(() => {
    if (language === 'sinhala') return 'ලිංගය';
    if (language === 'tamil') return 'பாலினம்';
    return 'Gender';
  }, [language]);

  const addressLabel = useMemo(() => {
    if (language === 'sinhala') return 'ලිපිනය';
    if (language === 'tamil') return 'முகவரி';
    return 'Address';
  }, [language]);

  const emergencyContactLabel = useMemo(() => {
    if (language === 'sinhala') return 'හදිසි සම්බන්ධතා අංකය (විකල්ප)';
    if (language === 'tamil') return 'அவசர தொடர்பு எண் (விருப்பம்)';
    return 'Emergency contact (optional)';
  }, [language]);

  function countDigits(value: string) {
    return (value.match(/\d/g) ?? []).length;
  }

  function passwordLooksValid(value: string) {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  }

  function validateStep(nextStep: 1 | 2 | 3) {
    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();
    const trimmedAddress = address.trim();
    const trimmedDob = dob.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmergency = emergencyContact.trim();

    if (step === 1) {
      if (!trimmedFullName) return 'Full name is required';
      if (trimmedFullName.length < 2) return 'Full name is too short';
      if (!trimmedEmail) return 'Email is required';
      if (!passwordLooksValid(password)) return 'Password must be 8+ chars with uppercase, lowercase, and a digit';
      if (password !== confirmPassword) return 'Passwords do not match';
    }

    if (step === 2 || nextStep === 3) {
      if (!trimmedPhone) return 'Phone number is required';
      if (countDigits(trimmedPhone) < 10) return 'Phone number must be at least 10 digits';
      if (!trimmedDob) return 'Date of birth is required';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob)) return 'Date of birth must be in YYYY-MM-DD format';
      if (!gender) return 'Gender is required';
      if (!trimmedAddress) return 'Address is required';
    }

    if (step === 3) {
      if (trimmedEmergency && countDigits(trimmedEmergency) < 10) {
        return 'Emergency contact must be at least 10 digits';
      }
    }

    return '';
  }

  function formatDobDate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const onDobChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShowDobPicker(false);
    if (!date) return;
    setDobDateValue(date);
    setDob(formatDobDate(date));
  };

  async function submitRegistration() {
    const stepError = validateStep(3);
    if (stepError) {
      setErrorMessage(stepError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    const payload: Record<string, any> = {
      role: 'patient',
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      phone: phone.trim(),
      dob: dob.trim(),
      gender,
      address: address.trim(),
    };

    const ec = emergencyContact.trim();
    if (ec) payload.emergency_contact = ec;

    try {
      const result = await apiPost<{ success: boolean; message?: string; user_id?: string }>(
        '/api/auth/register',
        payload
      );

      if (!result.ok) {
        const msg =
          (result.data && (result.data.message || result.data.error)) ||
          (result.status === 409
            ? 'Email already registered'
            : result.status === 400
              ? 'Invalid registration data'
              : 'Registration failed');
        setErrorMessage(String(msg));
        return;
      }

      if (result.data && result.data.success === false) {
        setErrorMessage(String(result.data.message || 'Registration failed'));
        return;
      }

      onRegistered?.(email.trim());
    } catch (e: any) {
      setErrorMessage(e?.message ? String(e.message) : 'Registration failed');
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

          <View style={styles.card}>
            <Text style={styles.stepText}>{step}/3</Text>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {step === 1 && (
                <>
                  <Text style={styles.label}>{nameLabel}</Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder={
                      language === 'sinhala'
                        ? 'ඔබගේ නම'
                        : language === 'tamil'
                          ? 'உங்கள் பெயர்'
                          : 'Your name'
                    }
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
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.label}>{phoneLabel}</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={language === 'sinhala' ? '07X XXX XXXX' : language === 'tamil' ? '07X XXX XXXX' : '07X XXX XXXX'}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    placeholderTextColor="#9aa4b2"
                    returnKeyType="next"
                    textContentType="telephoneNumber"
                  />

                  <Text style={[styles.label, { marginTop: 14 }]}>{dobLabel}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setShowDobPicker(true);
                      setErrorMessage('');
                    }}
                    style={styles.input}
                  >
                    <Text style={{ color: dob ? '#111827' : '#9aa4b2', fontWeight: '700' }}>
                      📅 {dob || '2000-01-31'}
                    </Text>
                  </TouchableOpacity>

                  {showDobPicker && (
                    <View style={{ marginTop: 8 }}>
                      <DateTimePicker
                        value={dobDateValue ?? new Date(2000, 0, 1)}
                        mode="date"
                        onChange={onDobChange}
                        maximumDate={new Date()}
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      />
                    </View>
                  )}

                  <Text style={[styles.label, { marginTop: 14 }]}>{genderLabel}</Text>
                  <View style={styles.genderRow}>
                    {(['Male', 'Female', 'Other'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        activeOpacity={0.85}
                        onPress={() => setGender(g)}
                        style={[styles.genderPill, gender === g && styles.genderPillActive]}
                      >
                        <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, { marginTop: 14 }]}>{addressLabel}</Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder={
                      language === 'sinhala'
                        ? 'ඔබගේ ලිපිනය'
                        : language === 'tamil'
                          ? 'உங்கள் முகவரி'
                          : 'Your address'
                    }
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    style={[styles.input, styles.textArea]}
                    placeholderTextColor="#9aa4b2"
                    multiline
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.label}>{emergencyContactLabel}</Text>
                  <TextInput
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    placeholder={language === 'sinhala' ? '07X XXX XXXX' : language === 'tamil' ? '07X XXX XXXX' : '07X XXX XXXX'}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    placeholderTextColor="#9aa4b2"
                    returnKeyType="done"
                  />
                </>
              )}

              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </ScrollView>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={() => {
                setErrorMessage('');

                if (step < 3) {
                  const nextStep = (step + 1) as 2 | 3;
                  const msg = validateStep(nextStep);
                  if (msg) {
                    setErrorMessage(msg);
                    return;
                  }
                  setStep(nextStep);
                  return;
                }

                submitRegistration();
              }}
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

            {step > 1 && (
              <TouchableOpacity
                onPress={() => {
                  setErrorMessage('');
                  setStep((step - 1) as 1 | 2);
                }}
                activeOpacity={0.7}
                style={styles.backWrap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.backText}>
                  {language === 'sinhala' ? 'පෙර' : language === 'tamil' ? 'முந்தையது' : 'Back'}
                </Text>
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
  buttonDisabled: {
    opacity: 0.7,
  },
  stepText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 10,
  },
  formScroll: {
    maxHeight: 420,
  },
  formScrollContent: {
    paddingBottom: 6,
  },
  errorText: {
    marginTop: 12,
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
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
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderPillActive: {
    borderColor: '#2E8B57',
    backgroundColor: '#f0fdf4',
  },
  genderText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },
  genderTextActive: {
    color: '#2E8B57',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
