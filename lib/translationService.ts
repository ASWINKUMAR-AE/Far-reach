import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * High-Speed Translation Service with multi-level In-Memory & Storage Caching
 * Optimized for real-time Speech and AI audio assistant response speeds.
 */

const MEMORY_CACHE = new Map<string, string>();
const STORAGE_CACHE_KEY = 'far_reach_translation_cache_v2';
let storageCacheLoaded = false;

// Pre-load top translations from local storage on app start
async function loadStorageCache() {
  if (storageCacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'string') {
          MEMORY_CACHE.set(k, v);
        }
      });
    }
  } catch (e) {
    // Ignore storage cache read error
  } finally {
    storageCacheLoaded = true;
  }
}

// Debounced async storage cache save
let saveTimeout: any = null;
function scheduleStorageSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const entries = Array.from(MEMORY_CACHE.entries()).slice(-500); // keep top 500 recent
      const obj = Object.fromEntries(entries);
      await AsyncStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(obj));
    } catch {}
  }, 2000);
}

// Initialize cache load
loadStorageCache();

/**
 * Fast Translation function with 0ms in-memory cache hit & timeout fallback
 */
export async function translateText(
  text: string,
  sourceLang: string = "auto",
  targetLang: string = "en"
): Promise<string> {
  if (!text || !text.trim()) return text;
  
  // Extract language codes (e.g., "en-IN" -> "en", "hi-IN" -> "hi", "ta-IN" -> "ta")
  const sl = sourceLang.split("-")[0].toLowerCase();
  const tl = targetLang.split("-")[0].toLowerCase();
  
  if (sl === tl && sl !== "auto") return text;

  const trimmed = text.trim();
  const cacheKey = `${sl}:${tl}:${trimmed}`;

  // 1. Instant 0ms Memory Cache Hit
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }

  try {
    // 2. Fast Network Request with 2.5s Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    const data = await response.json();
    
    let translatedText = "";
    if (data && data[0] && Array.isArray(data[0])) {
      data[0].forEach((item: any) => {
        if (item && item[0]) {
          translatedText += item[0];
        }
      });
    }
    
    const result = translatedText.trim() || trimmed;
    
    // Cache result
    MEMORY_CACHE.set(cacheKey, result);
    scheduleStorageSave();

    return result;
  } catch (error) {
    // On timeout or failure, return original text without blocking speech response
    return trimmed;
  }
}

/**
 * Parallel Batch Translation for maximum throughput
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string = "auto",
  targetLang: string = "en"
): Promise<string[]> {
  return Promise.all(texts.map(t => translateText(t, sourceLang, targetLang)));
}
