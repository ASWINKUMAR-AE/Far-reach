import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Advanced Voice Pack & Audio Synthesis Engine
 * Upgrades voice pack discovery, natural neural voice selection, and language mapping.
 * Note: Preserves exact user speech rate / response settings without modification.
 */

export interface VoicePack {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

let cachedVoices: Speech.Voice[] = [];
let voicesLoaded = false;

// Language code normalizer for regional Indian languages and global locales
export function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en-IN';
  const clean = lang.trim().toLowerCase().replace('_', '-');
  
  if (clean.startsWith('ta')) return 'ta-IN'; // Tamil
  if (clean.startsWith('hi')) return 'hi-IN'; // Hindi
  if (clean.startsWith('te')) return 'te-IN'; // Telugu
  if (clean.startsWith('kn')) return 'kn-IN'; // Kannada
  if (clean.startsWith('ml')) return 'ml-IN'; // Malayalam
  if (clean.startsWith('mr')) return 'mr-IN'; // Marathi
  if (clean.startsWith('bn')) return 'bn-IN'; // Bengali
  if (clean.startsWith('gu')) return 'gu-IN'; // Gujarati
  if (clean.startsWith('pa')) return 'pa-IN'; // Punjabi
  if (clean.startsWith('en')) return 'en-IN'; // English (India)
  return lang;
}

/**
 * Pre-warm and cache available voice packs from device TTS engine
 */
export async function loadVoicePacks(): Promise<Speech.Voice[]> {
  if (voicesLoaded && cachedVoices.length > 0) {
    return cachedVoices;
  }
  try {
    const available = await Speech.getAvailableVoicesAsync();
    if (available && Array.isArray(available)) {
      cachedVoices = available;
      voicesLoaded = true;
    }
  } catch (e) {
    console.log('[VoiceService] Voice packs lookup bypassed.');
  }
  return cachedVoices;
}

// Initial async load
loadVoicePacks();

/**
 * Selects the highest-fidelity / enhanced voice pack for a given language
 */
export async function getBestVoiceForLanguage(langCode: string): Promise<Speech.Voice | null> {
  const normalized = normalizeLanguageCode(langCode);
  const baseCode = normalized.split('-')[0];

  const voices = await loadVoicePacks();
  if (!voices || voices.length === 0) return null;

  // 1. Exact locale match with enhanced / natural quality (e.g. Siri, Google Enhanced, Neural)
  const exactMatches = voices.filter(v => 
    v.language?.toLowerCase().replace('_', '-') === normalized.toLowerCase()
  );

  if (exactMatches.length > 0) {
    // Prefer Enhanced / Premium / Natural voice packs
    const enhanced = exactMatches.find(v => 
      (v as any).quality === 'Enhanced' || 
      v.name?.toLowerCase().includes('enhanced') || 
      v.name?.toLowerCase().includes('natural') ||
      v.name?.toLowerCase().includes('neural') ||
      v.name?.toLowerCase().includes('premium') ||
      v.name?.toLowerCase().includes('google')
    );
    return enhanced || exactMatches[0];
  }

  // 2. Base language match (e.g. "ta", "hi")
  const baseMatches = voices.filter(v => 
    v.language?.toLowerCase().startsWith(baseCode)
  );

  if (baseMatches.length > 0) {
    const enhanced = baseMatches.find(v => 
      (v as any).quality === 'Enhanced' || 
      v.name?.toLowerCase().includes('enhanced') || 
      v.name?.toLowerCase().includes('natural') ||
      v.name?.toLowerCase().includes('neural')
    );
    return enhanced || baseMatches[0];
  }

  return null;
}

/**
 * Clean text specifically for high-clarity TTS output
 */
export function sanitizeSpeechText(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/[\p{Emoji}\p{Symbol}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Speaks text using the upgraded voice pack with exact preserved speech rate
 */
export async function speakUpgradedVoice(
  text: string,
  options: {
    language?: string;
    rate?: number;
    pitch?: number;
    onDone?: () => void;
    onStopped?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const clean = sanitizeSpeechText(text);
  if (!clean) return;

  const targetLang = normalizeLanguageCode(options.language || 'en-IN');
  const bestVoice = await getBestVoiceForLanguage(targetLang);

  const speechOptions: Speech.SpeechOptions = {
    language: targetLang,
    rate: options.rate !== undefined ? options.rate : 1.0, // preserved speech rate
    pitch: options.pitch !== undefined ? options.pitch : 1.0,
    onDone: options.onDone,
    onStopped: options.onStopped,
    onError: options.onError,
  };

  if (bestVoice && bestVoice.identifier) {
    speechOptions.voice = bestVoice.identifier;
  }

  try {
    await Speech.speak(clean, speechOptions);
  } catch (e) {
    // Fallback without voice identifier
    delete speechOptions.voice;
    Speech.speak(clean, speechOptions);
  }
}
