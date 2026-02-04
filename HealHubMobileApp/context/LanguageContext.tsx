import React, { createContext, useState, useContext, ReactNode } from 'react';

export type Language = 'english' | 'sinhala' | 'tamil';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations = {
  english: {
    welcome: 'Welcome to HealHub',
    select_language: 'Select Your Language',
    continue: 'Continue',
    english: 'English',
    sinhala: 'සිංහල',
    tamil: 'தமிழ்',
    tagline: 'Your Health Companion',
    healthcare: 'Healthcare Made Simple',
    next: 'Next',
    skip: 'Skip',
    select: 'Select',
    selected: 'Selected',
  },
  sinhala: {
    welcome: 'හීල්හබ් වෙත සාදරයෙන් පිළිගනිමු',
    select_language: 'ඔබගේ භාෂාව තෝරන්න',
    continue: 'කරගෙන යන්න',
    english: 'ඉංග්‍රීසි',
    sinhala: 'සිංහල',
    tamil: 'දෙමළ',
    tagline: 'ඔබගේ සෞඛ්‍ය සහයක',
    healthcare: 'සරල සෞඛ්‍ය සේවා',
    next: 'මීළඟ',
    skip: 'මඟ හරින්න',
    select: 'තෝරන්න',
    selected: 'තෝරාගත්',
  },
  tamil: {
    welcome: 'ஹீல்ஹப்பிற்கு வரவேற்கிறோம்',
    select_language: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    continue: 'தொடரவும்',
    english: 'ஆங்கிலம்',
    sinhala: 'சிங்களம்',
    tamil: 'தமிழ்',
    tagline: 'உங்கள் சுகாதார துணை',
    healthcare: 'எளிமையான சுகாதார பராமரிப்பு',
    next: 'அடுத்தது',
    skip: 'தவிர்க்கவும்',
    select: 'தேர்ந்தெடு',
    selected: 'தேர்ந்தெடுக்கப்பட்டது',
  },
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('english');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};