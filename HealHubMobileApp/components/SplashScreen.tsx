import React, { useEffect } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface CustomSplashProps {
  children: React.ReactNode;
  isAppReady: boolean;
}

SplashScreen.preventAutoHideAsync();

export default function CustomSplash({ children, isAppReady }: CustomSplashProps) {
  useEffect(() => {
    async function hideSplashScreen() {
      await SplashScreen.hideAsync();
    }

    if (isAppReady) {
      hideSplashScreen();
    }
  }, [isAppReady]);

  if (!isAppReady) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/splash.png')} 
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  image: {
    width: '80%',
    height: '80%',
  } as ImageStyle,
});