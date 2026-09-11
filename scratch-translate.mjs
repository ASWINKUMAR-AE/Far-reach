import fs from 'fs';
import path from 'path';

const localesDir = './i18n/locales';
const enPath = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

const langs = [
  'ta', 'te', 'mr', 'gu', 'pa', 'kn', 'bn', 'ml', 'or'
];

async function translateText(text, tl) {
  if (typeof text !== 'string') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    let result = '';
    if (data && data[0] && Array.isArray(data[0])) {
      data[0].forEach(item => { if(item[0]) result += item[0]; });
    }
    return result || text;
  } catch(e) {
    return text;
  }
}

async function translateObj(obj, tl) {
  const result = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      result[key] = await translateText(obj[key], tl);
    } else if (typeof obj[key] === 'object') {
      result[key] = await translateObj(obj[key], tl);
    }
  }
  return result;
}

async function run() {
  for (const lang of langs) {
    console.log(`Translating to ${lang}...`);
    const translated = await translateObj(enData, lang);
    fs.writeFileSync(path.join(localesDir, `${lang}.json`), JSON.stringify(translated, null, 2));
    console.log(`Saved ${lang}.json`);
  }
  
  // Create santali (sat) as a copy of Hindi as fallback since Google Translate doesn't support 'sat' via gtx easily
  const hiPath = path.join(localesDir, 'hi.json');
  if (fs.existsSync(hiPath)) {
    fs.copyFileSync(hiPath, path.join(localesDir, 'sat.json'));
    console.log("Saved sat.json (fallback to hi)");
  }
}

run();
