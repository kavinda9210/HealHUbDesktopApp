import React, { useState, useEffect, useRef } from 'react';

import { BackHandler, View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import HealHubLogo from './components/HealHubLogo';
import LanguageSelector from './components/LanguageSelector';
import IntroSlides from './components/IntroSlides';
import MainApp from './components/MainApp';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import Verification from './components/auth/Verification';
import Register from './components/auth/Register';
import EmailVerification from './components/auth/EmailVerification';
import Patientdashboard from './screens/Patientdashboard';
import AIWoundorRashDetect from './screens/AIWoundorRashDetect';
import Notifications from './screens/Notifications';
import NearbyAmbulance from './screens/NearbyAmbulance';
import AmbulanceStaffDashboard from './screens/AmbulanceStaffDashboard';
import DirectionsMap from './screens/DirectionsMap';
import {
  cancelScheduledAlarmsByKeyAsync,
  configureAlarmNotificationsAsync,
  OPEN_CLINIC_ACTION_ID,
  STOP_ALARM_ACTION_ID,
  TAKE_MEDICINE_ACTION_ID,
} from './utils/alarms';
import Constants from 'expo-constants';
import * as ExpoNotifications from 'expo-notifications';

import './utils/ambulanceBackgroundLocation';
import { saveAuth, clearAuth } from './utils/authStorage';
import { stopAmbulanceBackgroundLocationAsync } from './utils/ambulanceBackgroundLocation';
import { setShareEnabled } from './utils/ambulanceLocationStorage';

type PatientTabKey = 'home' | 'appointment' | 'medicine' | 'clinic' | 'reports' | 'profile';
type Screen = 'native-splash' | 'custom-splash' | 'language' | 'intro' | 'login' | 'forgot-password' | 'verification' | 'register' | 'email-verification' | 'patient-dashboard' | 'ai-detect' | 'directions' | 'notifications' | 'nearby-ambulance' | 'ambulance-dashboard' | 'main';

console.log('[App] App.tsx module loaded');

// CRITICAL: Prevent auto-hide AND keep native splash visible
SplashScreen.preventAutoHideAsync()
  .then(result => console.log('SplashScreen.preventAutoHideAsync() succeeded:', result))
  .catch(console.warn);

// Fail-safe: never allow native splash to block indefinitely.
setTimeout(() => {
  SplashScreen.hideAsync()
    .then(() => console.log('[Splash] Fail-safe hideAsync() executed'))
    .catch((e) => console.log('[Splash] Fail-safe hideAsync() failed:', e));
}, 6000);

export default function AppWrapper() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider>
          <ForceNativeSplashApp />
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function ForceNativeSplashApp() {
  const [screen, setScreen] = useState<Screen>('native-splash');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);

  const [directionsParams, setDirectionsParams] = useState<null | {
    backScreen: 'ai-detect' | 'patient-dashboard';
    origin?: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number };
    destinationName?: string;
  }>(null);
  const splashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [refreshToken, setRefreshToken] = useState<string>('');
  const [pendingMedicineTake, setPendingMedicineTake] = useState<
    | null
    | {
        reminderId: number;
        medicineName?: string;
        dosage?: string;
        reminderDate?: string;
        reminderTime?: string;
        alarmKey?: string;
      }
  >(null);

  const [pendingPatientTab, setPendingPatientTab] = useState<PatientTabKey | null>(null);
  const [pendingScreenAfterAuth, setPendingScreenAfterAuth] = useState<
    null | 'patient-dashboard' | 'notifications' | 'ai-detect' | 'nearby-ambulance'
  >(null);

  const navigateTo = (nextScreen: Screen) => {
    setScreen((current) => {
      if (current === nextScreen) return current;
      setScreenHistory((history) => [...history, current]);
      return nextScreen;
    });
  };

  const resetNavigation = (nextScreen: Screen) => {
    setScreenHistory([]);
    setScreen(nextScreen);
  };

  const goBack = () => {
    setScreenHistory((history) => {
      const previous = history[history.length - 1];
      if (!previous) return history;
      setScreen(previous);
      return history.slice(0, -1);
    });
  };

  const routeFromNotificationData = (data: any) => {
    const rawType = String(data?.type ?? data?.target ?? data?.screen ?? '').trim().toLowerCase();

    // Medicine reminder deep-link
    const reminderId = Number(data?.reminderId);
    if (Number.isFinite(reminderId) && reminderId > 0) {
      setPendingMedicineTake({
        reminderId,
        medicineName: data?.medicineName ? String(data.medicineName) : undefined,
        dosage: data?.dosage ? String(data.dosage) : undefined,
        reminderDate: data?.reminderDate ? String(data.reminderDate) : undefined,
        reminderTime: data?.reminderTime ? String(data.reminderTime) : undefined,
        alarmKey: data?.alarmKey ? String(data.alarmKey) : undefined,
      });
      setPendingPatientTab('medicine');
      return { screen: 'patient-dashboard' as const };
    }

    if (rawType.includes('ambulance')) return { screen: 'nearby-ambulance' as const };
    if (rawType.includes('ai')) return { screen: 'ai-detect' as const };
    if (rawType.includes('notification')) return { screen: 'notifications' as const };

    if (rawType.includes('medicine')) {
      setPendingPatientTab('medicine');
      return { screen: 'patient-dashboard' as const };
    }
    if (rawType.includes('clinic')) {
      setPendingPatientTab('clinic');
      return { screen: 'patient-dashboard' as const };
    }
    if (rawType.includes('report')) {
      setPendingPatientTab('reports');
      return { screen: 'patient-dashboard' as const };
    }
    if (rawType.includes('appointment')) {
      setPendingPatientTab('appointment');
      return { screen: 'patient-dashboard' as const };
    }

    // Default fallback
    return { screen: 'notifications' as const };
  };

  useEffect(() => {
    // Avoid blank screens if params are missing.
    if (screen === 'directions' && !directionsParams) {
      navigateTo('ai-detect');
    }
  }, [directionsParams, screen]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'native-splash' || screen === 'custom-splash') return true;
      if (screenHistory.length > 0) {
        goBack();
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [goBack, screen, screenHistory.length]);

  const handleNotificationResponse = (response: ExpoNotifications.NotificationResponse | null | undefined) => {
    try {
      if (!response) return;
      const actionId = String(response?.actionIdentifier ?? '');

      if (actionId === STOP_ALARM_ACTION_ID) {
        const alarmKey = (response as any)?.notification?.request?.content?.data?.alarmKey;
        if (!alarmKey) return;
        void cancelScheduledAlarmsByKeyAsync(String(alarmKey));
        return;
      }

      const isOpenAction =
        actionId === ExpoNotifications.DEFAULT_ACTION_IDENTIFIER || actionId === TAKE_MEDICINE_ACTION_ID || actionId === OPEN_CLINIC_ACTION_ID;
      if (!isOpenAction) return;

      const data: any = (response as any)?.notification?.request?.content?.data ?? {};
      const alarmKey = data?.alarmKey ? String(data.alarmKey) : '';
      if (alarmKey) {
        // Consider opening the notification as a response: stop any remaining repeats + missed marker.
        void cancelScheduledAlarmsByKeyAsync(alarmKey);
      }
      const target = routeFromNotificationData(data);

      if (!accessToken) {
        setPendingScreenAfterAuth(target.screen);
        navigateTo('login');
        return;
      }

      navigateTo(target.screen);
    } catch (e) {
      console.log('Notification response routing failed:', e);
    }
  };

  useEffect(() => {
    if (Constants.appOwnership === 'expo') {
      console.log('Expo Go detected: skipping alarm notifications configuration (use a dev build to test alarms).');
      return;
    }

    configureAlarmNotificationsAsync().catch((e) => console.log('Alarm notifications config failed:', e));
  }, []);

  useEffect(() => {
    const sub = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    ExpoNotifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) handleNotificationResponse(r);
      })
      .catch((e) => console.log('getLastNotificationResponseAsync failed:', e));

    return () => {
      sub.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    console.log('=== SPLASH SCREEN FLOW START ===');
    console.log('1. Native splash screen is showing');

    // Step 1: Keep native splash for 2 seconds
    splashTimer.current = setTimeout(async () => {
      console.log('2. 2 seconds passed, hiding native splash');
      
      try {
        await SplashScreen.hideAsync();
        console.log('3. Native splash hidden, showing custom splash');
        
        // Step 2: Show our custom animated splash
        navigateTo('custom-splash');
        
        // Step 3: Keep custom splash for another 2 seconds
        splashTimer.current = setTimeout(() => {
          console.log('4. Custom splash complete, showing language selection');
          navigateTo('language');
        }, 2000);
        
      } catch (error) {
        console.error('Error hiding splash:', error);
        navigateTo('language');
      }
    }, 2000);

    return () => {
      if (splashTimer.current) {
        clearTimeout(splashTimer.current);
      }
    };
  }, []);

  const handleLanguageSelected = () => {
    console.log('5. Language selected, showing intro slides');
    navigateTo('intro');
  };

  const goPostAuth = (user: any) => {
    const role = String(user?.role ?? '').toLowerCase();
    if (role === 'ambulance_staff') {
      navigateTo('ambulance-dashboard');
      return;
    }
    if (pendingScreenAfterAuth) {
      navigateTo(pendingScreenAfterAuth);
      setPendingScreenAfterAuth(null);
      return;
    }
    navigateTo('patient-dashboard');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed, showing forgot password screen');
    navigateTo('forgot-password');
  };

  const handleRegister = () => {
    console.log('Register pressed (UI only)');
    navigateTo('register');
  };

  const handleIntroDone = () => {
    console.log('Intro completed, showing login');
    navigateTo('login');
  };

  // Show native splash (invisible to us, controlled by Expo)
  if (screen === 'native-splash') {
    return null; // Native splash is showing
  }

  // Show our custom animated splash
  if (screen === 'custom-splash') {
    return (
      <View style={styles.fullScreen}>
        <HealHubLogo />
      </View>
    );
  }

  // Show language selection
  if (screen === 'language') {
    return <LanguageSelector onContinue={handleLanguageSelected} />;
  }

  // Show intro slides
  if (screen === 'intro') {
    return <IntroSlides onDone={handleIntroDone} />;
  }

  // Show login screen
  if (screen === 'login') {
    return (
      <Login
        onLoginSuccess={({ accessToken, refreshToken, user }) => {
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
          saveAuth({ accessToken, refreshToken, role: String(user?.role ?? '') }).catch(() => {});
          goPostAuth(user);
        }}
        onForgotPassword={handleForgotPassword}
        onRegister={handleRegister}
      />
    );
  }

  // Show forgot password screen
  if (screen === 'forgot-password') {
    return (
      <ForgotPassword
        onSendVerification={(email) => {
          console.log('Send verification pressed (UI only). Email:', email);
          setResetEmail(email);
          navigateTo('verification');
        }}
        onBack={goBack}
      />
    );
  }

  // Show verification screen
  if (screen === 'verification') {
    return (
      <Verification
        email={resetEmail}
        onVerify={({ email, code, password, confirmPassword }) => {
          console.log('Verify pressed (UI only):', { email, code, passwordLen: password.length, confirmPasswordLen: confirmPassword.length });
          navigateTo('login');
        }}
        onBack={goBack}
      />
    );
  }

  // Show register screen
  if (screen === 'register') {
    return (
      <Register
        onRegistered={(email) => {
          console.log('Register succeeded. Email:', email);
          setRegisterEmail(email);
          navigateTo('email-verification');
        }}
        onBack={goBack}
      />
    );
  }

  // Show email verification (after register)
  if (screen === 'email-verification') {
    return (
      <EmailVerification
        email={registerEmail}
        onVerified={({ accessToken, refreshToken, user }) => {
          console.log('Email verified successfully');
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
          saveAuth({ accessToken, refreshToken, role: String(user?.role ?? '') }).catch(() => {});
          goPostAuth(user);
        }}
        onBack={goBack}
      />
    );
  }

  // Show main app
  if (screen === 'main') {
    return (
      <MainApp
        onLogout={() => {
          setAccessToken('');
          setRefreshToken('');
          setShareEnabled(false).catch(() => {});
          stopAmbulanceBackgroundLocationAsync().catch(() => {});
          clearAuth().catch(() => {});
          setPendingMedicineTake(null);
          setPendingPatientTab(null);
          setPendingScreenAfterAuth(null);
          resetNavigation('login');
        }}
        onOpenPatientDashboard={() => navigateTo('patient-dashboard')}
      />
    );
  }

  if (screen === 'patient-dashboard') {
    return (
      <Patientdashboard
        accessToken={accessToken}
        pendingMedicineTake={pendingMedicineTake}
        onConsumePendingMedicineTake={() => setPendingMedicineTake(null)}
        pendingTab={pendingPatientTab}
        onConsumePendingTab={() => setPendingPatientTab(null)}
        onOpenAiDetect={() => navigateTo('ai-detect')}
        onOpenNotifications={() => navigateTo('notifications')}
        onOpenNearbyAmbulance={() => navigateTo('nearby-ambulance')}
        onLogout={() => {
          setAccessToken('');
          setRefreshToken('');
          setShareEnabled(false).catch(() => {});
          stopAmbulanceBackgroundLocationAsync().catch(() => {});
          clearAuth().catch(() => {});
          setPendingMedicineTake(null);
          setPendingPatientTab(null);
          setPendingScreenAfterAuth(null);
          resetNavigation('login');
        }}
      />
    );
  }

  if (screen === 'ai-detect' || screen === 'directions') {
    return (
      <View style={{ flex: 1 }}>
        <View
          style={[StyleSheet.absoluteFill, { display: screen === 'ai-detect' ? 'flex' : 'none' }]}
          pointerEvents={screen === 'ai-detect' ? 'auto' : 'none'}
        >
          <AIWoundorRashDetect
            accessToken={accessToken}
            onBack={goBack}
            onOpenDirections={(p) => {
              setDirectionsParams({
                backScreen: 'ai-detect',
                origin: p.origin ?? null,
                destination: p.destination,
                destinationName: p.destinationName,
              });
              navigateTo('directions');
            }}
          />
        </View>

        <View
          style={[StyleSheet.absoluteFill, { display: screen === 'directions' ? 'flex' : 'none' }]}
          pointerEvents={screen === 'directions' ? 'auto' : 'none'}
        >
          {directionsParams ? (
            <DirectionsMap
              origin={directionsParams.origin}
              destination={directionsParams.destination}
              destinationName={directionsParams.destinationName}
              onBack={() => {
                setDirectionsParams(null);
                goBack();
              }}
            />
          ) : null}
        </View>
      </View>
    );
  }

  if (screen === 'notifications') {
    return (
      <Notifications
        accessToken={accessToken}
        activeTab="home"
        onSelectTab={(tab) => {
          setPendingPatientTab(tab);
          navigateTo('patient-dashboard');
        }}
        onBack={goBack}
        onOpenNotificationType={(type) => {
          const t = String(type || '').trim().toLowerCase();
          if (t.includes('ambulance')) {
            navigateTo('nearby-ambulance');
            return;
          }
          if (t.includes('medicine')) {
            setPendingPatientTab('medicine');
            navigateTo('patient-dashboard');
            return;
          }
          if (t.includes('clinic')) {
            setPendingPatientTab('clinic');
            navigateTo('patient-dashboard');
            return;
          }
          if (t.includes('report')) {
            setPendingPatientTab('reports');
            navigateTo('patient-dashboard');
            return;
          }
          if (t.includes('appointment')) {
            setPendingPatientTab('appointment');
            navigateTo('patient-dashboard');
            return;
          }
        }}
      />
    );
  }

  if (screen === 'nearby-ambulance') {
    return <NearbyAmbulance accessToken={accessToken} onBack={goBack} />;
  }

  if (screen === 'ambulance-dashboard') {
    return (
      <AmbulanceStaffDashboard
        accessToken={accessToken}
        onBack={goBack}
        onLogout={() => {
          setAccessToken('');
          setRefreshToken('');
          setShareEnabled(false).catch(() => {});
          stopAmbulanceBackgroundLocationAsync().catch(() => {});
          clearAuth().catch(() => {});
          resetNavigation('login');
        }}
      />
    );
  }

  return <MainApp onLogout={() => resetNavigation('login')} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});