import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { apiPost } from '../../utils/api';

export type RegisterProps = {
  onRegistered?: (email: string) => void;
  onBack?: () => void;
};

type GenderValue = 'Male' | 'Female' | 'Other';

// ─── Underline Floating Input (same as Login) ─────────────────────────────────
function FloatingInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  textContentType,
  returnKeyType,
  leftIcon,
  rightAccessory,
  onSubmitEditing,
  inputRef,
  multiline,
}: any) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(anim, {
      toValue: 1, duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(anim, {
        toValue: 0, duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  };

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [18, 7] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 10] });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#aab8c2', '#2E8B57'],
  });

  return (
    <View style={[fi.wrap, { borderBottomColor: focused ? '#2E8B57' : '#e8edf2' }]}>
      {!!leftIcon && <View style={fi.leftIcon}>{leftIcon}</View>}
      <Animated.Text
        style={[
          fi.floatLabel,
          {
            top: labelTop,
            fontSize: labelSize,
            color: labelColor,
            left: leftIcon ? 40 : 0,
          },
        ]}
      >
        {label}
      </Animated.Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={focused || value ? placeholder : ''}
        placeholderTextColor="#c8d4dc"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        style={[
          fi.input,
          leftIcon ? { paddingLeft: 40 } : null,
          rightAccessory ? { paddingRight: 40 } : null,
          multiline ? fi.multiline : null,
        ]}
      />
      {!!rightAccessory && <View style={fi.rightAccessory}>{rightAccessory}</View>}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    paddingTop: 20,
    paddingBottom: 10,
    marginBottom: 24,
    position: 'relative',
  },
  leftIcon: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  rightAccessory: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  floatLabel: {
    position: 'absolute',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 15,
    color: '#0f1f18',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    paddingTop: 6,
    paddingLeft: 0,
    letterSpacing: 0.2,
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
});

// ─── Password strength indicator ─────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasLength = password.length >= 8;
  const score = [hasUpper, hasLower, hasDigit, hasLength].filter(Boolean).length;
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2E8B57'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const color = colors[score - 1] ?? '#e8edf2';
  const label = score > 0 ? labels[score - 1] : '';
  return (
    <View style={ps.wrap}>
      <View style={ps.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[ps.bar, { backgroundColor: i < score ? color : '#e8edf2' }]} />
        ))}
      </View>
      {!!label && <Text style={[ps.label, { color }]}>{label}</Text>}
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -16, marginBottom: 20 },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', minWidth: 40, textAlign: 'right' },
});

// ─── Step progress dots ───────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={sd.wrap}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            sd.dot,
            i < step ? sd.dotDone : i === step - 1 ? sd.dotActive : sd.dotInactive,
          ]}
        />
      ))}
      <Text style={sd.label}>Step {step} of {total}</Text>
    </View>
  );
}

const sd = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { backgroundColor: '#2E8B57', width: 24 },
  dotActive: { backgroundColor: '#2E8B57' },
  dotInactive: { backgroundColor: '#d4e8db' },
  label: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#7a9e8a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
});

// ─── Main Register ────────────────────────────────────────────────────────────
export default function Register({ onRegistered, onBack }: RegisterProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [dobDateValue, setDobDateValue] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState<GenderValue | ''>('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Refs for keyboard chain
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);
  const phoneRef = useRef<TextInput | null>(null);
  const addressRef = useRef<TextInput | null>(null);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const t = useMemo(() => {
    const s = (en: string, si: string, ta: string) =>
      language === 'sinhala' ? si : language === 'tamil' ? ta : en;
    return {
      title: s('Create account', 'ගිණුමක් සාදන්න', 'கணக்கை உருவாக்கு'),
      subtitle: s(
        'Create a new account to get started',
        'නව ගිණුමක් සාදා HealHub භාවිතා කරන්න',
        'புதிய கணக்கை உருவாக்கி HealHub பயன்படுத்துங்கள்',
      ),
      fullName: s('Full name', 'සම්පූර්ණ නම', 'முழு பெயர்'),
      namePlaceholder: s('Your name', 'ඔබගේ නම', 'உங்கள் பெயர்'),
      email: s('Email address', 'ඊමේල් ලිපිනය', 'மின்னஞ்சல் முகவரி'),
      password: s('Password', 'මුරපදය', 'கடவுச்சொல்'),
      confirm: s('Confirm password', 'මුරපදය තහවුරු කරන්න', 'கடவுச்சொல்லை உறுதிப்படுத்து'),
      phone: s('Phone number', 'දුරකථන අංකය', 'தொலைபேசி எண்'),
      dob: s('Date of birth', 'උපන් දිනය', 'பிறந்த நாள்'),
      gender: s('Gender', 'ලිංගය', 'பாலினம்'),
      address: s('Address', 'ලිපිනය', 'முகவரி'),
      addressPlaceholder: s('Your address', 'ඔබගේ ලිපිනය', 'உங்கள் முகவரி'),
      emergency: s('Emergency contact (optional)', 'හදිසි සම්බන්ධතා අංකය (විකල්ප)', 'அவசர தொடர்பு எண் (விருப்பம்)'),
      next: s('Continue', 'ඊළඟට', 'அடுத்து'),
      create: s('Create account', 'ගිණුම සාදන්න', 'கணக்கை உருவாக்கு'),
      creating: s('Creating…', 'සකසමින්…', 'உருவாக்குகிறது…'),
      back: s('Back', 'ආපසු', 'பின்செல்'),
      prevStep: s('Previous', 'පෙර', 'முந்தையது'),
      hasAccount: s('Already have an account?', 'දැනටමත් ගිණුමක් තිබේද?', 'ஏற்கனவே கணக்கு உள்ளதா?'),
      signIn: s('Sign in', 'පිවිසෙන්න', 'உள்நுழை'),
    };
  }, [language]);

  function countDigits(value: string) {
    return (value.match(/\d/g) ?? []).length;
  }

  function passwordLooksValid(value: string) {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  }

  function validateStep(nextStep: 1 | 2 | 3): string {
    if (step === 1) {
      if (!fullName.trim()) return 'Full name is required';
      if (fullName.trim().length < 2) return 'Full name is too short';
      if (!email.trim()) return 'Email is required';
      if (!passwordLooksValid(password))
        return 'Password must be 8+ chars with uppercase, lowercase, and a digit';
      if (password !== confirmPassword) return 'Passwords do not match';
    }
    if (step === 2 || nextStep === 3) {
      if (!phone.trim()) return 'Phone number is required';
      if (countDigits(phone.trim()) < 10) return 'Phone number must be at least 10 digits';
      if (!dob.trim()) return 'Date of birth is required';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim()))
        return 'Date of birth must be in YYYY-MM-DD format';
      if (!gender) return 'Gender is required';
      if (!address.trim()) return 'Address is required';
    }
    if (step === 3) {
      if (emergencyContact.trim() && countDigits(emergencyContact.trim()) < 10)
        return 'Emergency contact must be at least 10 digits';
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
    if (stepError) { setErrorMessage(stepError); return; }

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
        payload,
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
      if (result.data?.success === false) {
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

  function handleNext() {
    setErrorMessage('');
    if (step < 3) {
      const nextStep = (step + 1) as 2 | 3;
      const msg = validateStep(nextStep);
      if (msg) { setErrorMessage(msg); return; }
      setStep(nextStep);
      return;
    }
    submitRegistration();
  }

  const stepTitles = [
    [
      'Account details',
      'ගිණුම් විස්තර',
      'கணக்கு விவரங்கள்',
    ],
    [
      'Personal info',
      'පෞද්ගලික තොරතුරු',
      'தனிப்பட்ட தகவல்',
    ],
    [
      'Emergency contact',
      'හදිසි සම්බන්ධතා',
      'அவசர தொடர்பு',
    ],
  ];

  const stepSubtitles = [
    ['Set up your login credentials', 'ඔබගේ පිවිසුම් තොරතුරු සකසන්න', 'உங்கள் உள்நுழைவு விவரங்களை அமைக்கவும்'],
    ['Tell us about yourself', 'ඔබ ගැන අපට කියන්න', 'உங்களைப் பற்றி எங்களிடம் சொல்லுங்கள்'],
    ['Add an emergency contact', 'හදිසි සම්බන්ධතාවක් එකතු කරන්න', 'அவசர தொடர்பை சேர்க்கவும்'],
  ];

  const s = (en: string, si: string, ta: string) =>
    language === 'sinhala' ? si : language === 'tamil' ? ta : en;

  const currentTitle = s(...(stepTitles[step - 1] as [string, string, string]));
  const currentSubtitle = s(...(stepSubtitles[step - 1] as [string, string, string]));

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={st.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={st.flex}
          contentContainerStyle={[
            st.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(40, insets.bottom + 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Top nav ── */}
          <View style={st.topNav}>
            <TouchableOpacity
              onPress={() => {
                setErrorMessage('');
                if (step > 1) setStep((step - 1) as 1 | 2);
                else onBack?.();
              }}
              activeOpacity={0.7}
              style={st.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#2E8B57" />
              <Text style={st.backText}>{step > 1 ? t.prevStep : t.back}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Header ── */}
          <View style={st.header}>
            <View style={st.iconBadge}>
              <Ionicons
                name={step === 1 ? 'person-add-outline' : step === 2 ? 'body-outline' : 'call-outline'}
                size={22}
                color="#2E8B57"
              />
            </View>

            <StepDots step={step} total={3} />

            <Text style={st.title}>{currentTitle}</Text>
            <Text style={st.subtitle}>{currentSubtitle}</Text>
          </View>

          {/* ── Step 1: Account details ── */}
          {step === 1 && (
            <View style={st.form}>
              <FloatingInput
                label={t.fullName}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t.namePlaceholder}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
                leftIcon={<Ionicons name="person-outline" size={17} color="#9aafb7" />}
                onSubmitEditing={() => emailRef.current?.focus?.()}
              />

              <FloatingInput
                label={t.email}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                leftIcon={<Ionicons name="mail-outline" size={17} color="#9aafb7" />}
                onSubmitEditing={() => passwordRef.current?.focus?.()}
                inputRef={emailRef}
              />

              <FloatingInput
                label={t.password}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                returnKeyType="next"
                leftIcon={<Ionicons name="lock-closed-outline" size={17} color="#9aafb7" />}
                rightAccessory={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v: boolean) => !v)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color="#9aafb7"
                    />
                  </TouchableOpacity>
                }
                onSubmitEditing={() => confirmRef.current?.focus?.()}
                inputRef={passwordRef}
              />

              <PasswordStrength password={password} />

              <FloatingInput
                label={t.confirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry={!showConfirm}
                textContentType="password"
                returnKeyType="done"
                leftIcon={<Ionicons name="lock-open-outline" size={17} color="#9aafb7" />}
                rightAccessory={
                  <TouchableOpacity
                    onPress={() => setShowConfirm((v: boolean) => !v)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color="#9aafb7"
                    />
                  </TouchableOpacity>
                }
                onSubmitEditing={handleNext}
                inputRef={confirmRef}
              />

              {!!confirmPassword && (
                <View style={st.matchRow}>
                  <Ionicons
                    name={password === confirmPassword ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={14}
                    color={password === confirmPassword ? '#2E8B57' : '#c0392b'}
                    style={{ marginTop: 1 }}
                  />
                  <Text style={[st.matchText, { color: password === confirmPassword ? '#2E8B57' : '#c0392b' }]}>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Step 2: Personal info ── */}
          {step === 2 && (
            <View style={st.form}>
              <FloatingInput
                label={t.phone}
                value={phone}
                onChangeText={setPhone}
                placeholder="07X XXX XXXX"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="next"
                leftIcon={<Ionicons name="call-outline" size={17} color="#9aafb7" />}
                onSubmitEditing={() => addressRef.current?.focus?.()}
                inputRef={phoneRef}
              />

              {/* DOB field */}
              <View style={[fi.wrap, { borderBottomColor: showDobPicker ? '#2E8B57' : '#e8edf2' }]}>
                <View style={fi.leftIcon}>
                  <Ionicons name="calendar-outline" size={17} color="#9aafb7" />
                </View>
                <Text style={[fi.floatLabel, { top: 7, fontSize: 10, color: dob ? '#2E8B57' : '#aab8c2', left: 40 }]}>
                  {t.dob.toUpperCase()}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => { setShowDobPicker(true); setErrorMessage(''); }}
                  style={{ paddingTop: 22, paddingLeft: 40, paddingBottom: 4 }}
                >
                  <Text style={{ fontSize: 15, color: dob ? '#0f1f18' : '#c8d4dc', letterSpacing: 0.2 }}>
                    {dob || 'YYYY-MM-DD'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDobPicker && (
                <View style={{ marginTop: -12, marginBottom: 16 }}>
                  <DateTimePicker
                    value={dobDateValue ?? new Date(2000, 0, 1)}
                    mode="date"
                    onChange={onDobChange}
                    maximumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  />
                </View>
              )}

              {/* Gender selector */}
              <View style={st.genderSection}>
                <Text style={st.genderLabel}>{t.gender.toUpperCase()}</Text>
                <View style={st.genderRow}>
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      activeOpacity={0.85}
                      onPress={() => setGender(g)}
                      style={[st.genderPill, gender === g && st.genderPillActive]}
                    >
                      <Text style={[st.genderPillText, gender === g && st.genderPillTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <FloatingInput
                label={t.address}
                value={address}
                onChangeText={setAddress}
                placeholder={t.addressPlaceholder}
                autoCapitalize="sentences"
                returnKeyType="done"
                leftIcon={<Ionicons name="location-outline" size={17} color="#9aafb7" />}
                onSubmitEditing={handleNext}
                inputRef={addressRef}
                multiline
              />
            </View>
          )}

          {/* ── Step 3: Emergency contact ── */}
          {step === 3 && (
            <View style={st.form}>
              <View style={st.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#2E8B57" style={{ marginTop: 1 }} />
                <Text style={st.infoText}>
                  This is optional. You can add a contact number that can be reached in case of an emergency.
                </Text>
              </View>

              <FloatingInput
                label={t.emergency}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                placeholder="07X XXX XXXX"
                keyboardType="phone-pad"
                returnKeyType="done"
                leftIcon={<Ionicons name="heart-outline" size={17} color="#9aafb7" />}
                onSubmitEditing={handleNext}
              />
            </View>
          )}

          {/* ── Error ── */}
          {!!errorMessage && (
            <View style={st.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#c0392b" style={{ marginTop: 1 }} />
              <Text style={st.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ── Submit button ── */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[st.button, isSubmitting && st.buttonDisabled]}
              activeOpacity={1}
              disabled={isSubmitting}
              onPress={handleNext}
              onPressIn={pressIn}
              onPressOut={pressOut}
            >
              <Text style={st.buttonText}>
                {isSubmitting
                  ? t.creating
                  : step < 3
                  ? t.next
                  : t.create}
              </Text>
              {!isSubmitting && (
                <Ionicons
                  name={step < 3 ? 'arrow-forward' : 'checkmark'}
                  size={17}
                  color="#fff"
                  style={st.btnArrow}
                />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ── */}
          <View style={st.footer}>
            <Text style={st.footerMuted}>{t.hasAccount}</Text>
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={st.footerBtn}>
              <Text style={st.footerLink}>{t.signIn}</Text>
            </TouchableOpacity>
          </View>

          <Text style={st.wordmark}>HealHub</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN = '#2E8B57';
const GREEN_DARK = '#1f6b42';

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7fbf8' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32 },

  topNav: { marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 13.5, color: GREEN_DARK, fontWeight: '700', letterSpacing: 0.1 },

  header: { alignItems: 'flex-start', marginBottom: 8 },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e8f5ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0a1f14',
    letterSpacing: -1,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b8c78',
    lineHeight: 21,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 32,
  },

  form: { marginBottom: 8 },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: -16,
    marginBottom: 20,
    paddingLeft: 2,
  },
  matchText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

  // Gender
  genderSection: { marginBottom: 24 },
  genderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#aab8c2',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderPill: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderPillActive: { borderColor: GREEN, backgroundColor: '#e8f5ee' },
  genderPillText: {
    color: '#aab8c2',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
  genderPillTextActive: { color: GREEN },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e8f5ee',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#b6dfc8',
  },
  infoText: { flex: 1, fontSize: 13, color: GREEN_DARK, fontWeight: '500', lineHeight: 19 },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 16,
    paddingLeft: 2,
  },
  errorText: { flex: 1, fontSize: 12.5, color: '#c0392b', fontWeight: '500', lineHeight: 18 },

  // Button
  button: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15.5,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
  btnArrow: { marginLeft: 8 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  footerMuted: { fontSize: 13.5, color: '#8aA898', fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' },
  footerBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  footerLink: { fontSize: 13.5, color: GREEN_DARK, fontWeight: '800', letterSpacing: 0.1 },

  wordmark: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 11,
    letterSpacing: 4,
    color: '#b0c8b8',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
    textTransform: 'uppercase',
  },
});