import React, { useState, useEffect, useRef } from 'react';

import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from './context/LanguageContext';
import HealHubLogo from './components/HealHubLogo';
import LanguageSelector from './components/LanguageSelector';
import MainApp from './components/MainApp';

// CRITICAL: Prevent auto-hide AND keep native splash visible
SplashScreen.preventAutoHideAsync()
  .then(result => console.log('SplashScreen.preventAutoHideAsync() succeeded:', result))
  .catch(console.warn);

export default function AppWrapper() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <ForceNativeSplashApp />
      </SafeAreaProvider>
    </LanguageProvider>
  );
}

function ForceNativeSplashApp() {
  const [screen, setScreen] = useState<'native-splash' | 'custom-splash' | 'language' | 'main'>('native-splash');
  const splashTimer = useRef<NodeJS.Timeout | null>(null);

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
    console.log('5. Language selected, showing main app');
    setScreen('main');
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

  // Show main app
  return <MainApp />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
});