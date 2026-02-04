import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useLanguage, Language } from '../context/LanguageContext';

interface LanguageSelectorProps {
  onContinue: () => void;
}

const LanguageSelector = ({ onContinue }: LanguageSelectorProps) => {
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>(language);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'english', name: 'English', flag: '🇬🇧' },
    { code: 'sinhala', name: 'සිංහල', flag: '🇱🇰' },
    { code: 'tamil', name: 'தமிழ்', flag: '🇮🇳' },
  ];

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLang(lang);
    // Don't update context immediately, wait for continue button
  };

  const handleContinue = () => {
    // Update the actual language in context
    setLanguage(selectedLang);
    // Navigate to main app
    onContinue();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <Text style={styles.welcome}>
          {selectedLang === 'sinhala' ? 'හීල්හබ් වෙත සාදරයෙන් පිළිගනිමු' :
           selectedLang === 'tamil' ? 'ஹீல்ஹப்பிற்கு வரவேற்கிறோம்' :
           'Welcome to HealHub'}
        </Text>
        <Text style={styles.tagline}>
          {selectedLang === 'sinhala' ? 'ඔබගේ සෞඛ්‍ය සහයක' :
           selectedLang === 'tamil' ? 'உங்கள் சுகாதார துணை' :
           'Your Health Companion'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <View style={styles.heartIcon}>
            <Text style={styles.heartSymbol}>❤️</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {selectedLang === 'sinhala' ? 'ඔබගේ භාෂාව තෝරන්න' :
           selectedLang === 'tamil' ? 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்' :
           'Select Your Language'}
        </Text>

        <Text style={styles.subtitle}>
          {selectedLang === 'sinhala' ? 'පහසු භාවිතය සඳහා ඔබේ කැමති භාෂාව තෝරන්න' :
           selectedLang === 'tamil' ? 'எளிதான பயன்பாட்டிற்கு உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்' :
           'Choose your preferred language for easy use'}
        </Text>

        <View style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageCard,
                selectedLang === lang.code && styles.selectedCard,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageContent}>
                <View style={styles.languageHeader}>
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text
                      style={[
                        styles.languageName,
                        selectedLang === lang.code && styles.selectedText,
                      ]}
                    >
                      {lang.name}
                    </Text>
                    <Text style={styles.languageCode}>{lang.code.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {selectedLang === lang.code && (
                <View style={styles.selectedIndicator} pointerEvents="none">
                  <Text style={styles.selectedIndicatorText} numberOfLines={1} ellipsizeMode="tail">
                    {selectedLang === 'sinhala' ? 'තෝරාගත්' :
                     selectedLang === 'tamil' ? 'தேர்ந்தெடுக்கப்பட்டது' :
                     'Selected'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={!selectedLang}
        >
          <Text style={styles.continueButtonText}>
            {selectedLang === 'sinhala' ? 'කරගෙන යන්න' :
             selectedLang === 'tamil' ? 'தொடரவும்' :
             'Continue'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          {selectedLang === 'sinhala' ? 'ඔබට පසුව භාෂාව වෙනස් කළ හැකිය' :
           selectedLang === 'tamil' ? 'பின்னர் மொழியை மாற்றலாம்' :
           'You can change language later'}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40,
  },
  header: {
    paddingTop: 20,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
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
    position: 'relative',
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
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#2E8B57',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 160,
  },
  selectedIndicatorText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
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
  note: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default LanguageSelector;