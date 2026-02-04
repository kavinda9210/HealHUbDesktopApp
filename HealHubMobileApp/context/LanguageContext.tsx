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
    intro_medicine_title: 'Medicine Reminder System',
    intro_medicine_desc: 'Get timely reminders so you never miss a dose.',
    intro_rash_title: 'AI Rash Detector',
    intro_rash_desc: 'Scan and get quick guidance for skin rashes.',
    intro_ambulance_title: '24/7 Ambulance Support',
    intro_ambulance_desc: 'Request emergency help anytime, anywhere.',
    intro_back: 'Back',
    intro_get_started: 'Get Started',
  },
  sinhala: {
    welcome: 'HealHub වෙත සාදරයෙන් පිළිගනිමු',
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
    intro_medicine_title: 'ඖෂධ මතක් කිරීමේ පද්ධතිය',
    intro_medicine_desc: 'ඔබට ඖෂධ මාත්‍රාව මගහැර නොයෑමට වේලාවට මතක් කිරීම් ලබාදේ.',
    intro_rash_title: 'AI රෑෂ් හඳුනාගැනීම',
    intro_rash_desc: 'තෙල්මැසි/රෑෂ් පරීක්ෂා කර ඉක්මන් මඟපෙන්වීමක් ලබාගන්න.',
    intro_ambulance_title: '24/7 ඇම්බියුලන්ස් සහාය',
    intro_ambulance_desc: 'ඕනෑම වේලාවක, ඕනෑම තැනක හදිසි සහාය ඉල්ලන්න.',
    intro_back: 'ආපසු',
    intro_get_started: 'ආරම්භ කරන්න',
  },
  tamil: {
    welcome: 'HealHubக்கு வரவேற்கிறோம்',
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
    intro_medicine_title: 'மருந்து நினைவூட்டல் அமைப்பு',
    intro_medicine_desc: 'மருந்தை தவற விடாமல் நேரத்தில் நினைவூட்டல்கள் பெறுங்கள்.',
    intro_rash_title: 'AI சரும ரேஷ் கண்டறிதல்',
    intro_rash_desc: 'ரேஷ்களை ஸ்கேன் செய்து விரைவான வழிகாட்டல் பெறுங்கள்.',
    intro_ambulance_title: '24/7 ஆம்புலன்ஸ் சேவை',
    intro_ambulance_desc: 'எப்போதும், எங்கேயும் அவசர உதவியை கோருங்கள்.',
    intro_back: 'பின்செல்',
    intro_get_started: 'தொடங்குங்கள்',
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