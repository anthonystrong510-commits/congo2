import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CountryInfo,
  Language,
  AIRTEL_COUNTRIES,
  detectUserCountry,
} from '../data/countries';
import { getTranslation, TranslationKey } from '../i18n/translations';

interface AppContextValue {
  country: CountryInfo;
  setCountry: (country: CountryInfo, autoUpdateLanguage?: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
  hasUserSelectedCountry: boolean;
  setHasUserSelectedCountry: (value: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize country from stored preference or geo-smart detection
  const [country, setCountryState] = useState<CountryInfo>(() => {
    try {
      const savedCountryId = localStorage.getItem('airtel_country_id');
      if (savedCountryId) {
        const found = AIRTEL_COUNTRIES.find((c) => c.id === savedCountryId);
        if (found) return found;
      }
    } catch {}
    return detectUserCountry();
  });

  const [hasUserSelectedCountry, setHasUserSelectedCountry] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('airtel_country_selected'));
    } catch {
      return false;
    }
  });

  // Initialize language from stored preference or country default
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem('airtel_language') as Language;
      if (savedLang === 'fr' || savedLang === 'en') {
        return savedLang;
      }
    } catch {}
    // Smart default based on initial detected country
    return country.defaultLang;
  });

  // Set country and optionally sync language
  const setCountry = (newCountry: CountryInfo, autoUpdateLanguage: boolean = true) => {
    setCountryState(newCountry);
    setHasUserSelectedCountry(true);
    try {
      localStorage.setItem('airtel_country_id', newCountry.id);
      localStorage.setItem('airtel_country_selected', 'true');
    } catch {}

    if (autoUpdateLanguage) {
      setLanguageState(newCountry.defaultLang);
      try {
        localStorage.setItem('airtel_language', newCountry.defaultLang);
      } catch {}
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('airtel_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
  };

  const t = (key: TranslationKey) => getTranslation(key, language);

  return (
    <AppContext.Provider
      value={{
        country,
        setCountry,
        language,
        setLanguage,
        toggleLanguage,
        t,
        hasUserSelectedCountry,
        setHasUserSelectedCountry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
