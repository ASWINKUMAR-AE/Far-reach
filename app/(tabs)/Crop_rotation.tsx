import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Mic, Volume2, VolumeX, User, Bot, CheckSquare, Square } from 'lucide-react-native';
import { askHositAI } from '@/lib/hositAI';
import { translateText } from '@/lib/translationService';
import { DEFAULT_FARMER } from '@/lib/procurementService';

let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {}

type ChatMessage = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isPlaying?: boolean;
};

const LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
  { code: 'hi-IN', name: 'हिंदी (Hindi)' },
  { code: 'ml-IN', name: 'മലയാളം (Malayalam)' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
];

const CHEMICAL_FERTILIZERS = ['Urea', 'DAP', 'NPK', 'MOP', 'Super Phosphate'];
const ORGANIC_FERTILIZERS = ['Neem Cake', 'Vermicompost', 'Cow Dung Manure', 'Bone Meal', 'Green Manure'];

const CROP_ROTATION_MAP: { [key: string]: string } = {
  "wheat": "Pulses (Chickpea / Green Gram). Fixes nitrogen into soil after heavy wheat extraction.",
  "rice": "Chickpea / Mustard. Breaks damp pest cycles and restores soil aeration.",
  "paddy": "Black Gram / Groundnut. Prevents soil salinity and enriches organic nitrogen.",
  "maize": "Soybean. Replenishes nitrogen depleted during maize growth.",
  "cotton": "Pulses. Breaks bollworm pest cycle.",
  "sugarcane": "Wheat. Utilizes deep root soil nutrients.",
  "tomato": "Cabbage. Prevents bacterial wilt accumulation."
};

const FALLBACK_QUESTIONS = [
  "What was the last crop you harvested?",
  "What type of soil do you have?",
  "What is your budget or investment capability?",
  "What is your farm size (in acres)?",
];

export default function InteractiveCropRotationScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // Context Data
  const [weatherInfo, setWeatherInfo] = useState<string>('Temp: 31°C, Monsoon Expected');
  const [seasonInfo, setSeasonInfo] = useState<string>('Kharif');
  
  // Fertilizer UI State
  const [activeTab, setActiveTab] = useState<'Chemical' | 'Organic'>('Chemical');
  const [selectedFerts, setSelectedFerts] = useState<Set<string>>(new Set());
  const [translatedChem, setTranslatedChem] = useState<string[]>(CHEMICAL_FERTILIZERS);
  const [translatedOrg, setTranslatedOrg] = useState<string[]>(ORGANIC_FERTILIZERS);
  const [isFertsVisible, setIsFertsVisible] = useState(false);

  // Fallback Logic State
  const [fallbackStep, setFallbackStep] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [harvestedCrop, setHarvestedCrop] = useState('');

  const scrollViewRef = useRef<ScrollView | null>(null);
  const webRecognitionRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initContext();
    changeLanguage(LANGUAGES[0]);
  }, []);

  const initContext = async () => {
    // 1. Season Calculation
    const month = new Date().getMonth();
    if (month >= 5 && month <= 9) setSeasonInfo('Kharif (Monsoon)');
    else if (month >= 10 || month <= 2) setSeasonInfo('Rabi (Winter)');
    else setSeasonInfo('Zaid (Summer)');

    // 2. Weather fetching
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true`);
        const data = await res.json();
        if (data?.current_weather) {
          setWeatherInfo(`Temp: ${data.current_weather.temperature}°C, Wind: ${data.current_weather.windspeed} km/h. Moderate rainfall expected.`);
        }
      }
    } catch (e) {
      console.log('Weather fetch skipped');
    }
  };

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try { Haptics.impactAsync(style); } catch {}
  };

  useEffect(() => {
    if (isListening) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    } else pulseAnim.setValue(1);
  }, [isListening]);

  useEffect(() => {
    if (Platform.OS !== 'web' && Voice) {
      try {
        Voice.onSpeechResults = (e: any) => {
          if (e?.value?.[0]) handleSendMessage(e.value[0]);
          setIsListening(false);
          setInterimTranscript('');
        };
        Voice.onSpeechPartialResults = (e: any) => { if (e?.value?.[0]) setInterimTranscript(e.value[0]); };
        Voice.onSpeechEnd = () => setIsListening(false);
        Voice.onSpeechError = () => { setIsListening(false); setInterimTranscript(''); };
      } catch (err) {}
    }
  }, [selectedLang]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, interimTranscript, isFertsVisible]);

  const stopAllTTS = () => {
    try { Speech.stop(); } catch {}
    if (soundRef.current) {
      try {
        if (Platform.OS === 'web') { soundRef.current.pause(); soundRef.current.currentTime = 0; }
        else { soundRef.current.stopAsync(); soundRef.current.unloadAsync(); }
      } catch {}
      soundRef.current = null;
    }
    setCurrentlySpeakingId(null);
    setMessages((prev) => prev.map((m) => ({ ...m, isPlaying: false })));
  };

  const handleTTS = async (id: string, text: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (currentlySpeakingId === id) { stopAllTTS(); return; }
    const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/[\p{Emoji}\p{Symbol}]+/gu, ' ').trim();
    if (!clean) return;

    stopAllTTS();
    setCurrentlySpeakingId(id);
    setMessages((prev) => prev.map((m) => ({ ...m, isPlaying: m.id === id })));

    try {
      const langCode = selectedLang.code.split('-')[0];
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean.substring(0, 200))}&tl=${langCode}&client=tw-ob`;
      if (Platform.OS === 'web') {
        const audio = new window.Audio(url);
        soundRef.current = audio;
        audio.onended = () => stopAllTTS();
        await audio.play();
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) stopAllTTS(); });
      }
    } catch (e) {
      Speech.speak(clean, { language: selectedLang.code, onDone: stopAllTTS, onStopped: stopAllTTS, onError: stopAllTTS });
    }
  };

  const changeLanguage = async (lang: typeof LANGUAGES[0]) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLang(lang);
    stopAllTTS();
    
    try {
      const translatedGreeting = await translateText(
        "Hello! I am your AI Agronomist. To give you the best crop rotation plan, could you tell me: What was the last crop you harvested in your field?", 
        "en", lang.code
      );
      setMessages([{ id: Date.now().toString(), type: 'assistant', content: translatedGreeting, timestamp: new Date() }]);

      // Translate Fertilizers
      const tc = await Promise.all(CHEMICAL_FERTILIZERS.map(f => translateText(f, "en", lang.code)));
      const to = await Promise.all(ORGANIC_FERTILIZERS.map(f => translateText(f, "en", lang.code)));
      setTranslatedChem(tc);
      setTranslatedOrg(to);
    } catch (e) {}
  };

  const toggleFertilizer = (fert: string) => {
    triggerHaptic();
    const newFerts = new Set(selectedFerts);
    if (newFerts.has(fert)) newFerts.delete(fert);
    else newFerts.add(fert);
    setSelectedFerts(newFerts);
  };

  const handleSendMessage = async (text?: string) => {
    let messageText = (text ?? inputText).trim();
    if (!messageText && selectedFerts.size === 0) return;

    if (selectedFerts.size > 0 && !text) {
      const fertStr = Array.from(selectedFerts).join(', ');
      messageText = messageText ? `${messageText}. I also used these fertilizers: ${fertStr}` : `I used these fertilizers: ${fertStr}`;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    stopAllTTS();

    setMessages((prev) => [...prev, { id: Date.now().toString(), type: 'user', content: messageText, timestamp: new Date() }]);
    setInputText('');
    setInterimTranscript('');
    setSelectedFerts(new Set());
    setIsFertsVisible(false);
    setIsLoading(true);

    try {
      const englishPrompt = await translateText(messageText, 'auto', 'en');

      if (fallbackStep === 0 && englishPrompt.toLowerCase().includes('paddy') || englishPrompt.toLowerCase().includes('wheat')) {
        setHarvestedCrop(englishPrompt);
      }

      if (isOfflineMode) {
        handleOfflineDialogue(englishPrompt);
        return;
      }

      const historyContext = messages.map(m => `${m.type === 'assistant' ? 'AI' : 'Farmer'}: ${m.content}`).join('\n');
      const context = `Application: Far-Reach Crop Rotation Module
Farmer: ${DEFAULT_FARMER.name}
Auto-Fetched Soil Profile: ${DEFAULT_FARMER.soilType || 'Unknown'} (Use this unless farmer overrides)
Current Season: ${seasonInfo}
Live Weather: ${weatherInfo}

CRITICAL SUCCESSION RULES:
- If Previous Crop is Rice or Paddy: DO NOT suggest tree/shrub crops (like Mango, Banana). The field will be needed again in 6 months for the next Rice cycle. Suggest short-term pulses or legumes.
- If Previous Crop is Sugarcane: Suggest deep-rooted restorative crops like Wheat or Legumes to replenish soil nutrients.
- If Previous Crop is Cotton: DO NOT suggest closely related crops. Suggest non-host crops like Pulses to break the pest cycle (e.g., bollworm).

Goal: You are an expert agronomist AI. Ask for details one by one (last crop, soil, budget, farm size). Recommend a profitable rotation plan.
Current Conversation:
${historyContext}
Farmer's reply: ${englishPrompt}

Keep your tone friendly.`;

      const aiEnglishReply = await askHositAI({ message: englishPrompt, userId: DEFAULT_FARMER.id, context });

      // Fallback check
      if (aiEnglishReply.includes("I am here to help you") || aiEnglishReply.includes("Far Reach AI Assistant")) {
        console.log('AI generic fallback detected. Switching to offline mode.');
        setIsOfflineMode(true);
        handleOfflineDialogue(englishPrompt);
        return;
      }

      const reply = await translateText(aiEnglishReply, 'en', selectedLang.code);
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, type: 'assistant', content: reply, timestamp: new Date() }]);
      setTimeout(() => { handleTTS(assistantId, reply); }, 300);

    } catch {
      setMessages((prev) => [...prev, { id: Date.now().toString(), type: 'assistant', content: '⚠️ Network error.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineDialogue = async (userTextEn: string) => {
    let nextReplyEn = "";
    if (fallbackStep < FALLBACK_QUESTIONS.length - 1) {
      nextReplyEn = `Got it. ${FALLBACK_QUESTIONS[fallbackStep + 1]}`;
      setFallbackStep(fallbackStep + 1);
    } else {
      let rec = "Pulses or Legumes. They fix nitrogen and restore soil health.";
      const match = Object.keys(CROP_ROTATION_MAP).find(k => harvestedCrop.toLowerCase().includes(k) || userTextEn.toLowerCase().includes(k));
      if (match) rec = CROP_ROTATION_MAP[match];
      
      nextReplyEn = `Based on your inputs, the ${seasonInfo} season, and weather (${weatherInfo}), I recommend planting: ${rec} It is highly profitable for your soil.`;
      setFallbackStep(0);
      setIsOfflineMode(false);
    }

    const reply = await translateText(nextReplyEn, 'en', selectedLang.code);
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, type: 'assistant', content: reply, timestamp: new Date() }]);
    setTimeout(() => { handleTTS(assistantId, reply); }, 300);
    setIsLoading(false);
  };

  const handleVoiceToggle = async () => {
    triggerHaptic();
    if (Platform.OS === 'web') {
      const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      if (!SpeechRecognition) return alert('Speech recognition is not supported in this browser.');
      
      if (isListening) { if (webRecognitionRef.current) webRecognitionRef.current.stop(); setIsListening(false); return; }
      try {
        const recognition = new SpeechRecognition();
        webRecognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = selectedLang.code;
        recognition.onstart = () => { setIsListening(true); setInterimTranscript('Listening...'); };
        recognition.onresult = (e: any) => {
          let interim = '', finalTranscript = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript;
          }
          if (interim) setInterimTranscript(interim);
          if (finalTranscript.trim()) { setIsListening(false); setInterimTranscript(''); handleSendMessage(finalTranscript.trim()); }
        };
        recognition.onerror = () => { setIsListening(false); setInterimTranscript(''); };
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } catch (err) { setIsListening(false); }
      return;
    }
    
    try {
      if (!Voice) return alert('Native speech recognition requires Android/iOS.');
      if (isListening) { await Voice.stop(); setIsListening(false); } 
      else { setInterimTranscript('Listening...'); await Voice.start(selectedLang.code); setIsListening(true); }
    } catch (e) { setIsListening(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Feather name="sprout" size={24} color="#166534" />
        <Text style={styles.headerTitle}>AI Agronomist Voice Assistant</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.langContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            {LANGUAGES.map((lang) => {
              const isActive = selectedLang.code === lang.code;
              return (
                <TouchableOpacity key={lang.code} onPress={() => changeLanguage(lang)} style={[styles.langButton, isActive && styles.langButtonActive]}>
                  <Text style={isActive ? styles.langTextActive : styles.langText}>{lang.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}>
          {messages.map((m) => {
            const isUser = m.type === 'user';
            return (
              <View key={m.id} style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAi]}>
                {!isUser && <View style={styles.avatar}><Bot size={16} color="white" /></View>}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAi]}>{m.content}</Text>
                  {!isUser && (
                    <TouchableOpacity onPress={() => handleTTS(m.id, m.content)} style={styles.ttsBtn}>
                      {m.isPlaying ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} color="#166534" />}
                      <Text style={[styles.ttsText, m.isPlaying && { color: '#ef4444' }]}>{m.isPlaying ? 'Stop' : 'Listen'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          
          {isLoading && (
            <View style={[styles.messageWrapper, styles.messageWrapperAi]}>
              <View style={styles.avatar}><Bot size={16} color="white" /></View>
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator size="small" color="#166534" />
                <Text style={{ fontSize: 13, color: '#166534', marginTop: 4 }}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {isListening && (
          <View style={styles.listeningBanner}>
            <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
            <Text style={styles.listeningText}>{interimTranscript || `Listening in ${selectedLang.name}...`}</Text>
          </View>
        )}

        {isFertsVisible && (
          <View style={styles.fertContainer}>
            <View style={styles.fertTabs}>
              <TouchableOpacity onPress={() => setActiveTab('Chemical')} style={[styles.fertTab, activeTab === 'Chemical' && styles.fertTabActive]}>
                <Text style={[styles.fertTabText, activeTab === 'Chemical' && styles.fertTabTextActive]}>Chemical</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('Organic')} style={[styles.fertTab, activeTab === 'Organic' && styles.fertTabActive]}>
                <Text style={[styles.fertTabText, activeTab === 'Organic' && styles.fertTabTextActive]}>Organic</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fertList} nestedScrollEnabled>
              {(activeTab === 'Chemical' ? translatedChem : translatedOrg).map((f, i) => {
                const originalName = activeTab === 'Chemical' ? CHEMICAL_FERTILIZERS[i] : ORGANIC_FERTILIZERS[i];
                const isSelected = selectedFerts.has(f);
                return (
                  <TouchableOpacity key={originalName} onPress={() => toggleFertilizer(f)} style={styles.fertRow}>
                    {isSelected ? <CheckSquare size={20} color="#166534" /> : <Square size={20} color="#94A3B8" />}
                    <Text style={[styles.fertLabel, isSelected && styles.fertLabelActive]}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputArea}>
          <TouchableOpacity onPress={() => setIsFertsVisible(!isFertsVisible)} style={styles.attachBtn}>
            <Feather name="plus-circle" size={24} color={isFertsVisible ? '#166534' : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVoiceToggle}>
            <Animated.View style={[styles.micButton, { transform: [{ scale: pulseAnim }] }, isListening && styles.micButtonActive]}>
              <Mic size={24} color={isListening ? 'white' : '#166534'} />
            </Animated.View>
          </TouchableOpacity>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder={`Type or speak...`}
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity onPress={() => handleSendMessage()} style={styles.sendButton}>
              <Feather name="send" size={20} color="#166534" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  langContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  langButton: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#F1F5F9' },
  langButtonActive: { backgroundColor: '#166534' },
  langText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  langTextActive: { fontSize: 13, color: 'white', fontWeight: '700' },
  messagesContainer: { flex: 1, paddingTop: 16 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperAi: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 16 },
  bubbleUser: { backgroundColor: '#166534', borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: 'white' },
  messageTextAi: { color: '#0F172A' },
  ttsBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F1F5F9', alignSelf: 'flex-start', borderRadius: 8, gap: 4 },
  ttsText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  listeningBanner: { backgroundColor: '#DCFCE7', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  listeningText: { color: '#065f46', fontWeight: '600', fontSize: 14 },
  
  // Fertilizer UI
  fertContainer: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 10, maxHeight: 200 },
  fertTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  fertTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  fertTabActive: { borderBottomWidth: 2, borderBottomColor: '#166534' },
  fertTabText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  fertTabTextActive: { color: '#166534', fontWeight: '800' },
  fertList: { padding: 12 },
  fertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  fertLabel: { fontSize: 15, color: '#334155' },
  fertLabelActive: { color: '#166534', fontWeight: '700' },
  
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  attachBtn: { marginRight: 12 },
  micButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  micButtonActive: { backgroundColor: '#ef4444' },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 16 },
  textInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#0F172A' },
  sendButton: { padding: 8 },
});
