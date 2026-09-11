/**
 * Service to translate text using the free Google Translate API endpoint.
 * This is used to translate user input to English for AI processing,
 * and translate AI responses back to the user's native language.
 */

export async function translateText(
  text: string,
  sourceLang: string = "auto",
  targetLang: string = "en"
): Promise<string> {
  if (!text || !text.trim()) return text;
  
  // Extract language codes (e.g., "en-IN" -> "en", "hi-IN" -> "hi")
  const sl = sourceLang.split("-")[0];
  const tl = targetLang.split("-")[0];
  
  if (sl === tl) return text; // No translation needed

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    const data = await response.json();
    
    // The Google Translate API returns an array of arrays where the first element contains the translated fragments.
    let translatedText = "";
    if (data && data[0] && Array.isArray(data[0])) {
      data[0].forEach((item: any) => {
        if (item[0]) {
          translatedText += item[0];
        }
      });
    }
    
    return translatedText || text;
  } catch (error) {
    console.warn("Translation failed, falling back to original text:", error);
    return text;
  }
}
