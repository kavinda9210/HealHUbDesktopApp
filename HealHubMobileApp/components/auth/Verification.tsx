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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

// ─── Underline Floating Input (same as Login) ─────────────────────────────────
function FloatingInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  textContentType,
  returnKeyType,
  leftIcon,
  rightAccessory,
  onSubmitEditing,
  inputRef,
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
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        style={[
          fi.input,
          leftIcon ? { paddingLeft: 40 } : null,
          rightAccessory ? { paddingRight: 40 } : null,
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
          <View
            key={i}
            style={[ps.bar, { backgroundColor: i < score ? color : '#e8edf2' }]}
          />
        ))}
      </View>
      {!!label && <Text style={[ps.label, { color }]}>{label}</Text>}
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -16,
    marginBottom: 20,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    minWidth: 40,
    textAlign: 'right',
  },
});

// ─── Main Verification ────────────────────────────────────────────────────────
export default function Verification({ email, onVerify, onBack }: VerificationProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const passwordRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const t = useMemo(() => {
    const s = (en: string, si: string, ta: string) =>
      language === 'sinhala' ? si : language === 'tamil' ? ta : en;
    return {
      title: s('Reset password', 'මුරපදය යළි සකසන්න', 'கடவுச்சொல்லை மீட்டமை'),
      subtitle: s(
        'Enter the code you received and set a new password',
        'ඔබට ලැබුණු කේතය ඇතුළත් කර නව මුරපදය සකසන්න',
        'பெற்ற குறியீட்டை உள்ளிட்டு புதிய கடவுச்சொல்லை அமைக்கவும்',
      ),
      code: s('Verification code', 'සත්‍යාපන කේතය', 'சரிபார்ப்பு குறியீடு'),
      codePlaceholder: s('Enter code', 'කේතය ඇතුළත් කරන්න', 'குறியீட்டை உள்ளிடவும்'),
      password: s('New password', 'නව මුරපදය', 'புதிய கடவுச்சொல்'),
      confirm: s('Confirm password', 'මුරපදය තහවුරු කරන්න', 'கடவுச்சொல்லை உறுதிப்படுத்து'),
      btn: s('Update password', 'මුරපදය යාවත්කාලීන කරන්න', 'கடவுச்சொல்லை புதுப்பி'),
      loading: s('Updating…', 'යාවත්කාලීන කරමින්…', 'புதுப்பிக்கிறது…'),
      back: s('Back to sign in', 'පිවිසීමට ආපසු', 'உள்நுழைவுக்கு திரும்பு'),
      success: s('Password updated successfully!', 'මුරපදය සාර්ථකව යාවත්කාලීන විය!', 'கடவுச்சொல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!'),
    };
  }, [language]);

  function passwordLooksValid(value: string) {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  }

  async function submit() {
    const trimmedEmail = (email ?? '').trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) { setErrorMessage('Email is missing'); return; }
    if (!trimmedCode) { setErrorMessage('Verification code is required'); return; }
    if (!passwordLooksValid(password)) {
      setErrorMessage('Password must be 8+ chars with uppercase, lowercase, and a digit');
      return;
    }
    if (password !== confirmPassword) { setErrorMessage('Passwords do not match'); return; }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

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

      if (result.data?.success === false) {
        setErrorMessage(String(result.data.message || 'Password reset failed'));
        return;
      }

      setSuccessMessage(t.success);
      onVerify?.({ email: trimmedEmail, code: trimmedCode, password, confirmPassword });
    } catch (e: any) {
      setErrorMessage(e?.message ? String(e.message) : 'Password reset failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(40, insets.bottom + 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Back button ── */}
          {!!onBack && (
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.7}
              style={s.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#2E8B57" />
              <Text style={s.backText}>{t.back}</Text>
            </TouchableOpacity>
          )}

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.iconBadge}>
              <Ionicons name="key-outline" size={22} color="#2E8B57" />
            </View>

            <Text style={s.title}>{t.title}</Text>
            <Text style={s.subtitle}>{t.subtitle}</Text>

            {!!email && (
              <View style={s.emailChip}>
                <Ionicons name="mail-outline" size={13} color="#2E8B57" />
                <Text style={s.emailChipText}>{email}</Text>
              </View>
            )}
          </View>

          {/* ── Success alert ── */}
          {!!successMessage && (
            <View style={s.successAlert}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#1f6b42" style={{ marginTop: 1 }} />
              <Text style={s.successAlertText}>{successMessage}</Text>
            </View>
          )}

          {/* ── Form ── */}
          <View style={s.form}>
            <FloatingInput
              label={t.code}
              value={code}
              onChangeText={setCode}
              placeholder={t.codePlaceholder}
              keyboardType="number-pad"
              returnKeyType="next"
              leftIcon={<Ionicons name="shield-checkmark-outline" size={17} color="#9aafb7" />}
              onSubmitEditing={() => passwordRef.current?.focus?.()}
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
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
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
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color="#9aafb7"
                  />
                </TouchableOpacity>
              }
              onSubmitEditing={submit}
              inputRef={confirmRef}
            />

            {/* Passwords match indicator */}
            {!!confirmPassword && (
              <View style={s.matchRow}>
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={14}
                  color={password === confirmPassword ? '#2E8B57' : '#c0392b'}
                  style={{ marginTop: 1 }}
                />
                <Text style={[s.matchText, { color: password === confirmPassword ? '#2E8B57' : '#c0392b' }]}>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}

            {/* Error */}
            {!!errorMessage && (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#c0392b" style={{ marginTop: 1 }} />
                <Text style={s.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Submit */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
              <TouchableOpacity
                style={[s.button, isSubmitting && s.buttonDisabled]}
                activeOpacity={1}
                disabled={isSubmitting}
                onPress={submit}
                onPressIn={pressIn}
                onPressOut={pressOut}
              >
                <Text style={s.buttonText}>
                  {isSubmitting ? t.loading : t.btn}
                </Text>
                {!isSubmitting && (
                  <Ionicons name="arrow-forward" size={17} color="#fff" style={s.btnArrow} />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={s.wordmark}>HealHub</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN = '#2E8B57';
const GREEN_DARK = '#1f6b42';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7fbf8',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },

  // ── Back button ──
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 13.5,
    color: GREEN_DARK,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Header ──
  header: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e8f5ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
    marginBottom: 14,
  },

  // Email chip
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f5ee',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emailChipText: {
    fontSize: 12.5,
    color: GREEN_DARK,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Success alert ──
  successAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e8f5ee',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b6dfc8',
  },
  successAlertText: {
    flex: 1,
    fontSize: 13,
    color: GREEN_DARK,
    fontWeight: '600',
    lineHeight: 19,
  },

  // ── Form ──
  form: {
    marginBottom: 32,
  },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: -16,
    marginBottom: 20,
    paddingLeft: 2,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
    paddingLeft: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#c0392b',
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Button ──
  button: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15.5,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
  btnArrow: {
    marginLeft: 8,
  },

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