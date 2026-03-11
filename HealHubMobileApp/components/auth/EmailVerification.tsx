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

export type EmailVerificationProps = {
  email?: string;
  onVerified?: (auth: { accessToken: string; refreshToken: string; user: any }) => void;
  onBack?: () => void;
};

// ─── Underline Floating Input (same as Login) ─────────────────────────────────
function FloatingInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  returnKeyType,
  leftIcon,
  onSubmitEditing,
}: any) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
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
        value={value}
        onChangeText={onChangeText}
        placeholder={focused || value ? placeholder : ''}
        placeholderTextColor="#c8d4dc"
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        style={[fi.input, leftIcon ? { paddingLeft: 40 } : null]}
      />
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

// ─── Main EmailVerification ───────────────────────────────────────────────────
export default function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
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
      title: s('Email verification', 'ඊමේල් සත්‍යාපනය', 'மின்னஞ்சல் சரிபார்ப்பு'),
      subtitle: s(
        'Enter the 6-digit code sent to your email',
        'ඔබගේ ඊමේල් වෙත යවන ලද කේතය ඇතුළත් කරන්න',
        'உங்கள் மின்னஞ்சலுக்கு அனுப்பிய குறியீட்டை உள்ளிடவும்',
      ),
      code: s('Verification code', 'සත්‍යාපන කේතය', 'சரிபார்ப்பு குறியீடு'),
      codePlaceholder: s('Enter code', 'කේතය ඇතුළත් කරන්න', 'குறியீட்டை உள்ளிடவும்'),
      btn: s('Verify', 'සත්‍යාපනය කරන්න', 'சரிபார்க்கவும்'),
      loading: s('Verifying…', 'සකසමින්…', 'செயலாக்கப்படுகிறது…'),
      back: s('Back to sign in', 'පිවිසීමට ආපසු', 'உள்நுழைவுக்கு திரும்பு'),
      sentTo: s('Code sent to', 'කේතය යවන ලද්දේ', 'குறியீடு அனுப்பப்பட்டது'),
    };
  }, [language]);

  async function verify() {
    const trimmedEmail = (email ?? '').trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) { setErrorMessage('Email is missing'); return; }
    if (!trimmedCode) { setErrorMessage('Verification code is required'); return; }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await apiPost<any>('/api/auth/verify-email', {
        email: trimmedEmail,
        verification_code: trimmedCode,
      });

      if (!result.ok) {
        const msg =
          (result.data && (result.data.message || result.data.error)) ||
          (result.status === 400 ? 'Invalid or expired code' : 'Verification failed');
        setErrorMessage(String(msg));
        return;
      }

      if (result.data?.success === false) {
        setErrorMessage(String(result.data.message || 'Verification failed'));
        return;
      }

      setSuccessMessage(
        language === 'sinhala'
          ? 'සාර්ථකව සත්‍යාපනය විය!'
          : language === 'tamil'
          ? 'வெற்றிகரமாக சரிபார்க்கப்பட்டது!'
          : 'Email verified successfully!',
      );

      const accessToken = String(result.data?.access_token ?? '');
      const refreshToken = String(result.data?.refresh_token ?? '');
      onVerified?.({ accessToken, refreshToken, user: result.data?.user });
    } catch (e: any) {
      setErrorMessage(e?.message ? String(e.message) : 'Verification failed');
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
              <Ionicons name="shield-checkmark-outline" size={22} color="#2E8B57" />
            </View>

            <Text style={s.title}>{t.title}</Text>
            <Text style={s.subtitle}>{t.subtitle}</Text>

            {/* Email chip */}
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
              returnKeyType="done"
              leftIcon={<Ionicons name="key-outline" size={17} color="#9aafb7" />}
              onSubmitEditing={verify}
            />

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
                onPress={verify}
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