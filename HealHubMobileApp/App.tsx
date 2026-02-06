import React, { useState, useEffect, useRef } from 'react';

import { View, StyleSheet } from 'react-native';
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
import { configureAlarmNotificationsAsync } from './utils/alarms';
import Constants from 'expo-constants';

// CRITICAL: Prevent auto-hide AND keep native splash visible
SplashScreen.preventAutoHideAsync()
  .then(result => console.log('SplashScreen.preventAutoHideAsync() succeeded:', result))
  .catch(console.warn);

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
  const [screen, setScreen] = useState<'native-splash' | 'custom-splash' | 'language' | 'intro' | 'login' | 'forgot-password' | 'verification' | 'register' | 'email-verification' | 'patient-dashboard' | 'ai-detect' | 'notifications' | 'nearby-ambulance' | 'main'>('native-splash');
  const splashTimer = useRef<NodeJS.Timeout | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');

  useEffect(() => {
    if (Constants.appOwnership === 'expo') {
      console.log('Expo Go detected: skipping alarm notifications configuration (use a dev build to test alarms).');
      return;
    }

    configureAlarmNotificationsAsync().catch((e) => console.log('Alarm notifications config failed:', e));
  }, []);

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
        setScreen('custom-splash');
        
        // Step 3: Keep custom splash for another 2 seconds
        splashTimer.current = setTimeout(() => {
          console.log('4. Custom splash complete, showing language selection');
          setScreen('language');
        }, 2000);
        
      } catch (error) {
        console.error('Error hiding splash:', error);
        setScreen('language');
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
    setScreen('intro');
  };

  const handleLogin = () => {
    console.log('Login pressed (UI only), entering main app');
    setScreen('main');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed, showing forgot password screen');
    setScreen('forgot-password');
  };

  const handleRegister = () => {
    console.log('Register pressed (UI only)');
    setScreen('register');
  };

  const handleIntroDone = () => {
    console.log('Intro completed, showing login');
    setScreen('login');
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
        onLogin={handleLogin}
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
          setScreen('verification');
        }}
        onBack={() => setScreen('login')}
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
          setScreen('login');
        }}
        onBack={() => setScreen('forgot-password')}
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
          setScreen('email-verification');
        }}
        onBack={() => setScreen('login')}
      />
    );
  }

  // Show email verification (after register)
  if (screen === 'email-verification') {
    return (
      <EmailVerification
        email={registerEmail}
        onVerified={() => {
          console.log('Email verified successfully');
          setScreen('main');
        }}
        onBack={() => setScreen('register')}
      />
    );
  }

  // Show main app
  if (screen === 'main') {
    return (
      <MainApp
        onLogout={() => setScreen('login')}
        onOpenPatientDashboard={() => setScreen('patient-dashboard')}
      />
    );
  }

  if (screen === 'patient-dashboard') {
    return (
      <Patientdashboard
        onOpenAiDetect={() => setScreen('ai-detect')}
        onOpenNotifications={() => setScreen('notifications')}
        onOpenNearbyAmbulance={() => setScreen('nearby-ambulance')}
        onLogout={() => setScreen('login')}
      />
    );
  }

  if (screen === 'ai-detect') {
    return <AIWoundorRashDetect onBack={() => setScreen('patient-dashboard')} />;
  }

  if (screen === 'notifications') {
    return <Notifications onBack={() => setScreen('patient-dashboard')} />;
  }

  if (screen === 'nearby-ambulance') {
    return <NearbyAmbulance onBack={() => setScreen('patient-dashboard')} />;
  }

  return <MainApp onLogout={() => setScreen('login')} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
});