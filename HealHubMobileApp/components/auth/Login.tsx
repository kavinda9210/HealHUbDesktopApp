import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { apiPost } from '../../utils/api';

const { height: SH } = Dimensions.get('window');

export type LoginProps = {
  onLogin?: (params: { email: string; password: string }) => void;
  onLoginSuccess?: (auth: { accessToken: string; refreshToken: string; user: any }) => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
};

// ─── Underline Floating Input ─────────────────────────────────────────────────
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

// ─── Main Login ───────────────────────────────────────────────────────────────
export default function Login({
  onLogin,
  onLoginSuccess,
  onForgotPassword,
  onRegister,
}: LoginProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const t = useMemo(() => {
    const s = (en: string, si: string, ta: string) =>
      language === 'sinhala' ? si : language === 'tamil' ? ta : en;
    return {
      langLabel: s('English', 'සිංහල', 'தமிழ்'),
      hint: s('Selected language', 'තෝරාගත් භාෂාව', 'தேர்ந்தெடுத்த மொழி'),
      title: s('Welcome back', 'නැවතත් සාදරයෙන්', 'மீண்டும் வரவேற்கிறோம்'),
      subtitle: s(
        'Sign in to continue with HealHub',
        'ඔබගේ HealHub ගිණුමට පිවිසෙන්න',
        'உங்கள் HealHub கணக்கில் தொடரவும்',
      ),
      email: s('Email address', 'ඊමේල් ලිපිනය', 'மின்னஞ்சல் முகவரி'),
      password: s('Password', 'මුරපදය', 'கடவுச்சொல்'),
      btn: s('Sign in', 'පිවිසෙන්න', 'உள்நுழை'),
      loading: s('Signing in…', 'සකසමින්…', 'செயலாக்கப்படுகிறது…'),
      forgot: s('Forgot password?', 'මුරපදය අමතකද?', 'கடவுச்சொல் மறந்துவிட்டதா?'),
      register: s('Create account', 'ගිණුමක් සාදන්න', 'கணக்கு உருவாக்கு'),
      noAccount: s("Don't have an account?", 'ගිණුමක් නැද්ද?', 'கணக்கு இல்லையா?'),
    };
  }, [language]);

  async function submitLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setErrorMessage('Email is required'); return; }
    if (!password) { setErrorMessage('Password is required'); return; }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await apiPost<any>('/api/auth/login', { email: trimmedEmail, password });
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
      if (result.data?.success === false) {
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
    // Root fills screen edge-to-edge, including behind status bar
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
          {/* ── Header ── */}
          <View style={s.header}>
            {/* Flat logo — no ring */}
            <Image
              source={require('../../assets/HealHub_icon.png')}
              style={s.logoImage}
              resizeMode="contain"
              accessibilityLabel="HealHub"
            />

            {/* Language badge */}
            <View style={s.langBadge}>
              <View style={s.langDot} />
              <Text style={s.langText}>{t.hint}: {t.langLabel}</Text>
            </View>

            <Text style={s.title}>{t.title}</Text>
            <Text style={s.subtitle}>{t.subtitle}</Text>
          </View>

          {/* ── Form ── */}
          <View style={s.form}>
            <FloatingInput
              label={t.email}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              leftIcon={<Ionicons name="mail-outline" size={17} color="#9aafb7" />}
              onSubmitEditing={() => passwordInputRef.current?.focus?.()}
            />

            <FloatingInput
              label={t.password}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              textContentType="password"
              returnKeyType="done"
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
              onSubmitEditing={submitLogin}
              inputRef={passwordInputRef}
            />

            {/* Forgot */}
            <TouchableOpacity
              onPress={onForgotPassword}
              activeOpacity={0.7}
              style={s.forgotWrap}
            >
              <Text style={s.forgotText}>{t.forgot}</Text>
            </TouchableOpacity>

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
                onPress={submitLogin}
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

          {/* ── Footer ── */}
          <View style={s.footer}>
            <Text style={s.footerMuted}>{t.noAccount}</Text>
            <TouchableOpacity onPress={onRegister} activeOpacity={0.7} style={s.footerBtn}>
              <Text style={s.footerLink}>{t.register}</Text>
            </TouchableOpacity>
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
  // Fills entire screen including behind the status bar
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

  // ── Header ──
  header: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },

  // Flat logo — no ring, no border, no shadow
  logoImage: {
    width: 42,
    height: 42,
    marginBottom: 24,
  },

  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  langDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  langText: {
    fontSize: 11,
    color: '#7a9e8a',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
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
  },

  // ── Form ──
  form: {
    marginBottom: 32,
  },

  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 28,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 12.5,
    color: GREEN,
    fontWeight: '700',
    letterSpacing: 0.2,
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

  // Button — flat, no heavy shadow
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

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  footerMuted: {
    fontSize: 13.5,
    color: '#8aA898',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  footerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  footerLink: {
    fontSize: 13.5,
    color: GREEN_DARK,
    fontWeight: '800',
    letterSpacing: 0.1,
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