import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

export const defaultNS = 'common';
export const resources = {
  en: { common: en },
  hi: { common: hi },
};

i18next
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4' as any,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;