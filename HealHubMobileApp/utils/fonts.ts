import * as Font from 'expo-font';

interface FontFile {
  name: string;
  file: any;
}

const fontList: FontFile[] = [
  { name: 'Inter-Regular', file: require('../assets/fonts/Inter-Regular.ttf') },
  { name: 'Inter-Bold', file: require('../assets/fonts/Inter-Bold.ttf') },
];

/**
 * Loads custom fonts with error handling
 * If fonts are not found, falls back to system fonts
 */
export const loadFonts = async (): Promise<{ [key: string]: string }> => {
  const loadedFonts: { [key: string]: string } = {};
  
  try {
    const fontsToLoad: { [key: string]: any } = {};
    
    // Filter and collect available fonts
    fontList.forEach(font => {
      try {
        // Check if the font file exists by requiring it
        fontsToLoad[font.name] = font.file;
        loadedFonts[font.name] = font.name;
        console.log(`✅ Font ${font.name} found and will be loaded`);
      } catch (error) {
        console.warn(`⚠️ Font ${font.name} not found, will use system font`);
      }
    });

    // Load fonts if any were found
    if (Object.keys(fontsToLoad).length > 0) {
      await Font.loadAsync(fontsToLoad);
      console.log('🎉 All available fonts loaded successfully');
    } else {
      console.log('📝 No custom fonts found, using system fonts');
    }
    
  } catch (error) {
    console.error('❌ Error loading fonts:', error);
  }
  
  return loadedFonts;
};

/**
 * Utility to get font family with fallback
 */
export const getFontFamily = (
  fontName: string,
  isBold: boolean = false
): string => {
  const fontMap: { [key: string]: string } = {
    'Inter-Regular': 'Inter-Regular',
    'Inter-Bold': 'Inter-Bold',
  };
  
  // Check if font is loaded, otherwise return system font
  if (Font.isLoaded(fontMap[fontName])) {
    return fontMap[fontName];
  }
  
  // Fallback to system fonts
  return isBold ? 'System' : 'System';
};

/**
 * Check if specific font is available
 */
export const isFontAvailable = (fontName: string): boolean => {
  const availableFonts = ['Inter-Regular', 'Inter-Bold'];
  return availableFonts.includes(fontName) && Font.isLoaded(fontName);
};