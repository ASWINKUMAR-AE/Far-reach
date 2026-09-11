import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';
import kn from './locales/kn.json';
import bn from './locales/bn.json';
import ml from './locales/ml.json';
import or from './locales/or.json';
import sat from './locales/sat.json';

export const defaultNS = 'common';
export const resources = {
  en: { common: en },
  hi: { common: hi },
  ta: { common: ta },
  te: { common: te },
  mr: { common: mr },
  gu: { common: gu },
  pa: { common: pa },
  kn: { common: kn },
  bn: { common: bn },
  ml: { common: ml },
  or: { common: or },
  sat: { common: sat },
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