import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, Language } from '../context/LanguageContext';

const LanguageSelector = ({ onLanguageSelected }: { onLanguageSelected?: () => void }) => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'english', name: t('english'), flag: '🇬🇧' },
    { code: 'sinhala', name: t('sinhala'), flag: '🇱🇰' },
    { code: 'tamil', name: t('tamil'), flag: '🇮🇳' },
  ];

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    if (onLanguageSelected) {
      onLanguageSelected();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <Text style={styles.welcome}>{t('welcome')}</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <View style={styles.content}>
        {/* <View style={styles.iconContainer}>
          <View style={styles.heartIcon}>
            <Text style={styles.heartSymbol}>❤️</Text>
          </View>
        </View> */}

        <Text style={styles.title}>{t('select_language')}</Text>
        <Text style={styles.subtitle}>
          Choose your preferred language for better experience
        </Text>

        <View style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageCard,
                language === lang.code && styles.selectedCard,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageContent}>
                <View style={styles.languageHeader}>
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      language === lang.code && styles.selectedText
                    ]}>
                      {lang.name}
                    </Text>
                    <Text style={styles.languageCode}>{lang.code.toUpperCase()}</Text>
                  </View>
                </View>
                
                {/* {language === lang.code && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>✓ {t('selected')}</Text>
                  </View>
                )} */}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heartIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heartSymbol: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  languageList: {
    gap: 16,
    marginBottom: 40,
  },
  languageCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  selectedCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E8B57',
  },
  languageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedText: {
    color: '#2E8B57',
    fontWeight: '600',
  },
  languageCode: {
    fontSize: 14,
    color: '#888',
  },
  selectedIndicator: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  continueButton: {
    backgroundColor: '#2E8B57',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LanguageSelector;