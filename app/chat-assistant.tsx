import React, { useEffect, useRef, useState } from "react";
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
  Modal,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Bot,
  Sparkles,
  SlidersHorizontal,
  X,
  RotateCcw,
  Headphones,
} from "lucide-react-native";
import { askHositAI } from "@/lib/hositAI";
import { translateText } from "@/lib/translationService";
import { speakUpgradedVoice } from "@/lib/voiceService";
import { DEFAULT_FARMER, INITIAL_BOOKING, INITIAL_RECORD } from "@/lib/procurementService";

// Safe import for native Voice (Android/iOS builds)
let Voice: any = null;
try {
  Voice = require("@react-native-voice/voice").default;
} catch (e) {
  // Handled gracefully for web or dev environments
}

type ChatMessage = {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isPlaying?: boolean;
};

interface VoiceSettings {
  autoReadResponses: boolean;
  speechRate: number; // 0.75, 1.0, 1.25, 1.5
  speechPitch: number; // 0.8, 1.0, 1.2
  autoSendOnSpeechEnd: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  autoReadResponses: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  autoSendOnSpeechEnd: true,
};

const SETTINGS_STORAGE_KEY = "@far_reach_voice_settings_v1";

// 🌾 Indian Agricultural Languages with accurate BCP-47 codes
const LANGUAGES = [
  { code: "en-IN", name: "English (India)" },
  { code: "hi-IN", name: "हिंदी (Hindi)" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
  { code: "te-IN", name: "తెలుగు (Telugu)" },
  { code: "mr-IN", name: "मराठी (Marathi)" },
  { code: "gu-IN", name: "ગુજરાતી (Gujarati)" },
  { code: "pa-IN", name: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)" },
  { code: "bn-IN", name: "বাংলা (Bengali)" },
  { code: "ml-IN", name: "മലയാളം (Malayalam)" },
  { code: "or-IN", name: "ଓଡ଼ିଆ (Odia)" },
  { code: "sat-IN", name: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)" },
];

export default function ChatAssistantScreen() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content: "👋 Welcome to Far-Reach Voice Assistant! Ask me anything about crop prices, mandi queues, digital tokens, or soil advisory.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const webRecognitionRef = useRef<any>(null);
  const soundRef = useRef<any>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.4)).current;
  const waveAnim2 = useRef(new Animated.Value(0.8)).current;
  const waveAnim3 = useRef(new Animated.Value(0.5)).current;

  // Load saved voice settings
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
          setVoiceSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (err) {
        console.warn("Could not load voice settings:", err);
      }
    })();
  }, []);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {}
  };

  const saveSettings = async (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.warn("Could not persist voice settings:", err);
    }
  };

  // Mic pulse animation & audio waveforms
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1.2, duration: 300, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 1.4, duration: 350, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 0.2, duration: 350, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim3, { toValue: 1.1, duration: 280, useNativeDriver: true }),
            Animated.timing(waveAnim3, { toValue: 0.4, duration: 280, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Native Speech setup for Android & iOS mobile devices
  useEffect(() => {
    if (Platform.OS !== "web" && Voice) {
      try {
        Voice.onSpeechResults = (e: any) => {
          const text = e?.value?.[0] ?? "";
          if (text) {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            if (voiceSettings.autoSendOnSpeechEnd) {
              handleSendMessage(text);
            } else {
              setInputText(text);
            }
          }
          setIsListening(false);
          setInterimTranscript("");
        };
        Voice.onSpeechPartialResults = (e: any) => {
          const text = e?.value?.[0] ?? "";
          if (text) setInterimTranscript(text);
        };
        Voice.onSpeechEnd = () => {
          setIsListening(false);
        };
        Voice.onSpeechError = () => {
          setIsListening(false);
          setInterimTranscript("");
        };
      } catch (err) {
        console.log("[Native Voice] Unavailable in this runtime mode.");
      }

      return () => {
        try {
          if (Voice && typeof Voice.destroy === "function") {
            Voice.destroy().catch(() => {});
          }
        } catch {}
      };
    }
  }, [voiceSettings.autoSendOnSpeechEnd, selectedLang]);

  // Scroll to bottom on new messages or speech activity
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, interimTranscript]);

  const cleanTextForTTS = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#+\s/g, "")
      .replace(/[\p{Emoji}\p{Symbol}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const stopAllTTS = () => {
    try {
      Speech.stop();
    } catch {}
    
    if (Platform.OS === "web" && soundRef.current) {
      try {
        soundRef.current.pause();
        soundRef.current.currentTime = 0;
      } catch {}
      soundRef.current = null;
    } else if (Platform.OS !== "web" && soundRef.current) {
      try {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    
    setCurrentlySpeakingId(null);
    setMessages((prev) => prev.map((m) => ({ ...m, isPlaying: false })));
  };

  const handleTTS = async (id: string, text: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (currentlySpeakingId === id) {
      stopAllTTS();
      return;
    }

    const clean = cleanTextForTTS(text);
    if (!clean) return;

    stopAllTTS();
    setCurrentlySpeakingId(id);
    setMessages((prev) =>
      prev.map((m) => ({ ...m, isPlaying: m.id === id }))
    );

    try {
      if (Platform.OS === "web") {
        const langCode = selectedLang.code.split("-")[0];
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean.substring(0, 200))}&tl=${langCode}&client=tw-ob`;
        
        const audio = new window.Audio(url);
        audio.playbackRate = voiceSettings.speechRate;
        soundRef.current = audio;
        
        audio.onended = () => {
          stopAllTTS();
        };
        
        await audio.play();
      } else {
        // Universal Cloud TTS for Mobile
        const langCode = selectedLang.code.split("-")[0];
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean.substring(0, 200))}&tl=${langCode}&client=tw-ob`;
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, rate: voiceSettings.speechRate }
        );
        soundRef.current = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            stopAllTTS();
          }
        });
      }
    } catch (e) {
      console.warn("TTS Error, falling back to local TTS:", e);
      speakUpgradedVoice(clean, {
        language: selectedLang.code,
        rate: voiceSettings.speechRate,
        pitch: voiceSettings.speechPitch,
        onDone: stopAllTTS,
        onStopped: stopAllTTS,
        onError: stopAllTTS,
      });
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = (text ?? inputText).trim();
    if (!messageText) return;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    stopAllTTS();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setInterimTranscript("");
    setIsLoading(true);

    try {
      // 1. Translate user message to English (auto-detects Tanglish/Hinglish/Native)
      const englishPrompt = await translateText(messageText, "auto", "en");

      const context = `Application: Far-Reach Procurement & Agriculture OS (SIH26032)
Farmer Language: English
Farmer Profile:
- Name: ${DEFAULT_FARMER.name}
- Farmer ID: ${DEFAULT_FARMER.id}
- Crop: ${INITIAL_BOOKING.crop}
- Quantity: ${INITIAL_BOOKING.quantityKg} kg
- Active Centre: ${INITIAL_BOOKING.centreName}
- Digital Token: #${INITIAL_BOOKING.token}
- Current Token Serving: #132 (15 farmers ahead, ~45 min wait)
- Weighing Status: Net 500 kg @ ₹23.50/kg = ₹11,750
- Payment Status: Processing (Ref: ${INITIAL_RECORD.transactionRef})

Task: You are an expert agricultural AI assistant for an Indian farmer. YOU MUST answer all agriculture-related questions (crops, farming techniques, soil, weather, fertilizers, market prices, etc.) thoroughly and accurately. Do not refuse to answer agricultural queries. Provide the response in clear English.`;

      const isFertilizerQuery = englishPrompt.toLowerCase().includes('fertilizer') || englishPrompt.toLowerCase().includes('npk');
      let contextLayer = context;
      // If it is a fertilizer query, hit the Deterministic API silently first
      if (isFertilizerQuery) {
        try {
          // Assume default params for demo voice query (e.g. 2 acres Rice)
          const resp = await fetch('http://106.51.21.4:6001/api/v1/fertilizer/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              crop: "Rice",
              area: 2,
              area_unit: "acre",
              soil: { N: 150, P: 10, K: 100, pH: 6.5 } // Simulate low N
            })
          });
          const data = await resp.json();
          if (data && data.status === 'success') {
            contextLayer += `
              CRITICAL INSTRUCTION: You MUST use the following deterministic calculation for the user's fertilizer query. DO NOT invent numbers.
              Crop: Rice (2 Acres).
              Calculated Required (kg): N=${data.calculation.required_npk_total.targetN_total}, P=${data.calculation.required_npk_total.targetP_total}.
              Chemical Options: ${JSON.stringify(data.recommendation.chemical_options)}
              Organic Options: ${JSON.stringify(data.recommendation.organic_options)}
              Explain this to the farmer simply in a voice-friendly conversational tone. Mention the exact quantities derived.
            `;
          }
        } catch (e) {
          console.log("Silent deterministic fetch failed", e);
        }
      }

      const aiEnglishReply = await askHositAI({
        message: englishPrompt,
        userId: DEFAULT_FARMER.id,
        context: contextLayer,
      });

      // 2. Translate AI's English response back to the farmer's native language
      const reply = await translateText(aiEnglishReply, "en", selectedLang.code);

      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        type: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (voiceSettings.autoReadResponses) {
        setTimeout(() => {
          handleTTS(assistantId, reply);
        }, 300);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: t("chat.error", { defaultValue: "⚠️ Unable to connect to Far-Reach AI service. Please check your network and try again." }),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cross-Platform Speech Toggle (Mobile native + Browser)
  const handleVoiceToggle = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);

    // 1. WEB BROWSER MODE
    if (Platform.OS === "web") {
      const SpeechRecognition =
        typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
      }

      if (isListening) {
        if (webRecognitionRef.current) {
          webRecognitionRef.current.stop();
        }
        setIsListening(false);
        setInterimTranscript("");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        webRecognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = selectedLang.code;

        recognition.onstart = () => {
          setIsListening(true);
          setInterimTranscript("Listening...");
        };

        recognition.onresult = (event: any) => {
          let interim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) {
            setInterimTranscript(interim);
          }

          if (finalTranscript.trim()) {
            setIsListening(false);
            setInterimTranscript("");
            if (voiceSettings.autoSendOnSpeechEnd) {
              handleSendMessage(finalTranscript.trim());
            } else {
              setInputText(finalTranscript.trim());
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Web Speech Error:", event.error);
          setIsListening(false);
          setInterimTranscript("");
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err: any) {
        console.warn("Could not start Web Speech:", err);
        setIsListening(false);
        setInterimTranscript("");
      }
      return;
    }

    // 2. MOBILE NATIVE MODE (Android / iOS)
    try {
      if (!Voice || typeof Voice.start !== "function") {
        if (isListening) {
          setIsListening(false);
          return;
        }
        setIsListening(true);
        setInterimTranscript('Simulating voice input...');
        setTimeout(() => {
          setIsListening(false);
          setInterimTranscript('');
          handleSendMessage("What is the current wait time at Samayapuram?");
        }, 2500);
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert("Microphone permission is required to use voice chat.");
        return;
      }

      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      } else {
        setInterimTranscript("Listening...");
        await Voice.start(selectedLang.code);
        setIsListening(true);
      }
    } catch (e) {
      console.warn("Native Voice toggle error:", e);
      setIsListening(false);
    }
  };

  const handleClearChat = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const doClear = () => {
      stopAllTTS();
      setMessages([
        {
          id: Date.now().toString(),
          type: "assistant",
          content: `Chat cleared. How can Far-Reach assist your farming today in ${selectedLang.name}?`,
          timestamp: new Date(),
        },
      ]);
      setIsSettingsOpen(false);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Clear all chat messages and restart conversation?")) {
        doClear();
      }
    } else {
      Alert.alert(
        "Clear Conversation",
        "Are you sure you want to reset the chat history?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: doClear },
        ]
      );
    }
  };

  const testVoiceSample = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    stopAllTTS();
    const sampleText =
      selectedLang.code === "hi-IN"
        ? "नमस्ते किसान भाई, यह फ़ार-रीच वॉयस असिस्टेंट की आवाज़ है।"
        : selectedLang.code === "ta-IN"
        ? "வணக்கம் விவசாய நண்பரே, இது ஃபார்-ரீச் குரல் உதவியாளர்."
        : "Hello farmer, this is a test of your Far-Reach voice assistant settings.";

    speakUpgradedVoice(sampleText, {
      language: selectedLang.code,
      rate: voiceSettings.speechRate,
      pitch: voiceSettings.speechPitch,
    });
  };

  // Quick Procurement & Agronomy Prompts
  const QUICK_PROMPTS = [
    "Check my token & mandi queue status",
    "Where is the best price for paddy today?",
    "Why was Samayapuram centre recommended?",
    "Check payment status for lot #147",
    "What moisture limit is allowed for wheat?",
    "Best fertilizer schedule for black cotton soil",
  ];

  const renderMessage = (item: ChatMessage) => {
    const isUser = item.type === "user";
    const isPlaying = currentlySpeakingId === item.id;

    return (
      <View
        key={item.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userMessageContent : styles.assistantMessageContent,
          ]}
        >
          <View
            style={[
              styles.messageHeader,
              isUser ? styles.userMessageHeader : styles.assistantMessageHeader,
            ]}
          >
            <View
              style={[
                styles.avatar,
                isUser ? styles.userAvatar : styles.assistantAvatar,
              ]}
            >
              {isUser ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
            </View>
            <Text style={styles.timestamp}>
              {item.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userMessageBubble : styles.assistantMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userMessageText : styles.assistantMessageText,
              ]}
            >
              {item.content}
            </Text>
          </View>
          {!isUser && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => handleTTS(item.id, item.content)}
                style={[styles.ttsButton, isPlaying && styles.ttsButtonActive]}
              >
                {isPlaying ? (
                  <VolumeX size={14} color="#ef4444" />
                ) : (
                  <Volume2 size={14} color="#059669" />
                )}
                <Text style={[styles.ttsText, isPlaying && { color: "#ef4444" }]}>
                  {isPlaying ? t("chat.stopSpeaking", { defaultValue: "Stop Speaking" }) : t("chat.listen", { defaultValue: "Listen" })}
                </Text>
              </TouchableOpacity>

              {isPlaying && (
                <View style={styles.miniWaveform}>
                  <Animated.View
                    style={[styles.waveBar, { transform: [{ scaleY: waveAnim1 }] }]}
                  />
                  <Animated.View
                    style={[styles.waveBar, { transform: [{ scaleY: waveAnim2 }] }]}
                  />
                  <Animated.View
                    style={[styles.waveBar, { transform: [{ scaleY: waveAnim3 }] }]}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile-First Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
            <ArrowLeft size={20} color="#065f46" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>{t("chat.headerTitle", { defaultValue: "Far-Reach Voice OS" })}</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{t("chat.active", { defaultValue: "Active" })}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {t("chat.headerSubtitle", { defaultValue: "Smart Mandi & Crop Assistant" })} ({selectedLang.name})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setIsSettingsOpen(true);
            }}
            style={styles.settingsButton}
          >
            <SlidersHorizontal size={20} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Language Quick Selector */}
        <View style={styles.langContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            {LANGUAGES.map((lang) => {
              const isActive = selectedLang.code === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLang(lang);
                    i18n.changeLanguage(lang.code.split('-')[0]);
                    stopAllTTS();
                  }}
                  style={[styles.langButton, isActive && styles.langButtonActive]}
                >
                  <Text style={isActive ? styles.langTextActive : styles.langText}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Messages Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {messages.map((m) => renderMessage(m))}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={{ fontSize: 13, color: "#065f46", marginLeft: 8 }}>
                  Consulting Far-Reach Agronomy & Mandi Database...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Global Floating Stop Speaking Bar */}
        {currentlySpeakingId && (
          <View style={styles.speakingBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Volume2 size={16} color="#065f46" />
              <Text style={{ fontSize: 13, color: "#065f46", fontWeight: "600" }}>
                {t("chat.speakingResponse", { defaultValue: "Speaking Response Aloud..." })}
              </Text>
            </View>
            <TouchableOpacity onPress={stopAllTTS} style={styles.stopSpeakingBtn}>
              <VolumeX size={14} color="white" />
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>{t("chat.stop", { defaultValue: "Stop" })}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time Listening Banner */}
        {isListening && (
          <View style={styles.listeningBanner}>
            <View style={styles.waveformContainer}>
              <Animated.View
                style={[styles.liveWaveBar, { transform: [{ scaleY: waveAnim1 }] }]}
              />
              <Animated.View
                style={[styles.liveWaveBar, { transform: [{ scaleY: waveAnim2 }] }]}
              />
              <Animated.View
                style={[styles.liveWaveBar, { transform: [{ scaleY: waveAnim3 }] }]}
              />
            </View>
            <Text style={styles.listeningText} numberOfLines={2}>
              {interimTranscript || t("chat.listeningPrompt", { defaultValue: "Listening... speak now in " }) + selectedLang.name}
            </Text>
          </View>
        )}

        {/* Quick Prompts Carousel */}
        <View style={styles.quickPromptsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSendMessage(prompt)}
                style={styles.promptChip}
              >
                <Sparkles size={12} color="#166534" />
                <Text style={styles.promptChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mobile Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputContent}>
            <View style={styles.textInputContainer}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={`${t("chat.askIn", { defaultValue: "Ask in " })}${selectedLang.name}...`}
                multiline
                style={styles.textInput}
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={() => handleSendMessage()}
              />
            </View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={handleVoiceToggle}
                style={[
                  styles.voiceButton,
                  isListening ? styles.listeningVoiceButton : styles.normalVoiceButton,
                ]}
              >
                {isListening ? (
                  <MicOff size={22} color="white" />
                ) : (
                  <Mic size={22} color="white" />
                )}
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() && !isLoading}
              style={[
                styles.sendButton,
                inputText.trim() ? styles.activeSendButton : styles.inactiveSendButton,
              ]}
            >
              <Send size={22} color={inputText.trim() ? "white" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 🛠️ Mobile-Optimized Voice & Speech Settings Modal */}
      <Modal
        visible={isSettingsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Headphones size={22} color="#059669" />
                <Text style={styles.modalTitle}>Voice & Speech Settings</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSettingsOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Option: Auto-read responses */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingLabel}>Auto-Read AI Answers</Text>
                  <Text style={styles.settingDesc}>
                    Automatically speak out responses aloud when received.
                  </Text>
                </View>
                <Switch
                  value={voiceSettings.autoReadResponses}
                  onValueChange={(val) => {
                    triggerHaptic();
                    saveSettings({ ...voiceSettings, autoReadResponses: val });
                  }}
                  trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                  thumbColor={voiceSettings.autoReadResponses ? "#059669" : "#f1f5f9"}
                />
              </View>

              {/* Option: Auto-send on speech end */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingLabel}>Auto-Send After Speaking</Text>
                  <Text style={styles.settingDesc}>
                    Send query directly when you finish speaking.
                  </Text>
                </View>
                <Switch
                  value={voiceSettings.autoSendOnSpeechEnd}
                  onValueChange={(val) => {
                    triggerHaptic();
                    saveSettings({ ...voiceSettings, autoSendOnSpeechEnd: val });
                  }}
                  trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                  thumbColor={voiceSettings.autoSendOnSpeechEnd ? "#059669" : "#f1f5f9"}
                />
              </View>

              {/* Option: Speech Speed */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>Speech Speed (Voice Rate)</Text>
                <Text style={styles.settingDesc}>
                  Adjust how fast the assistant speaks responses:
                </Text>
                <View style={styles.pillGroup}>
                  {[
                    { label: "0.75x (Slow)", value: 0.75 },
                    { label: "1.0x (Normal)", value: 1.0 },
                    { label: "1.25x (Fast)", value: 1.25 },
                    { label: "1.5x (Brisk)", value: 1.5 },
                  ].map((speed) => {
                    const isSelected = voiceSettings.speechRate === speed.value;
                    return (
                      <TouchableOpacity
                        key={speed.value}
                        onPress={() => {
                          triggerHaptic();
                          saveSettings({ ...voiceSettings, speechRate: speed.value });
                        }}
                        style={[styles.pill, isSelected && styles.pillActive]}
                      >
                        <Text style={isSelected ? styles.pillTextActive : styles.pillText}>
                          {speed.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Option: Speech Pitch */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>Voice Pitch</Text>
                <Text style={styles.settingDesc}>Tone adjustment for speech clarity:</Text>
                <View style={styles.pillGroup}>
                  {[
                    { label: "0.8x (Deeper)", value: 0.8 },
                    { label: "1.0x (Natural)", value: 1.0 },
                    { label: "1.2x (Clear/High)", value: 1.2 },
                  ].map((pitch) => {
                    const isSelected = voiceSettings.speechPitch === pitch.value;
                    return (
                      <TouchableOpacity
                        key={pitch.value}
                        onPress={() => {
                          triggerHaptic();
                          saveSettings({ ...voiceSettings, speechPitch: pitch.value });
                        }}
                        style={[styles.pill, isSelected && styles.pillActive]}
                      >
                        <Text style={isSelected ? styles.pillTextActive : styles.pillText}>
                          {pitch.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action: Test Voice */}
              <TouchableOpacity onPress={testVoiceSample} style={styles.testVoiceBtn}>
                <Volume2 size={18} color="#059669" />
                <Text style={styles.testVoiceText}>
                  Test Current Voice in {selectedLang.name}
                </Text>
              </TouchableOpacity>

              {/* Action: Clear Conversation */}
              <TouchableOpacity onPress={handleClearChat} style={styles.clearChatBtn}>
                <RotateCcw size={16} color="#ef4444" />
                <Text style={styles.clearChatText}>Clear Conversation History</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setIsSettingsOpen(false);
              }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#052e16", fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: "#059669", fontSize: 12, marginTop: 1 },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  onlineText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  langContainer: {
    backgroundColor: "#f0fdf4",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  langButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "white",
    marginRight: 8,
    justifyContent: "center",
  },
  langButtonActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  langText: { color: "#166534", fontSize: 13, fontWeight: "500" },
  langTextActive: { color: "#fff", fontWeight: "700", fontSize: 13 },
  messagesContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 10 },
  messageContainer: { flexDirection: "row", marginBottom: 16 },
  userMessageContainer: { justifyContent: "flex-end" },
  assistantMessageContainer: { justifyContent: "flex-start" },
  messageContent: { maxWidth: "85%" },
  userMessageContent: { alignItems: "flex-end" },
  assistantMessageContent: { alignItems: "flex-start" },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userMessageHeader: { flexDirection: "row-reverse" },
  assistantMessageHeader: { flexDirection: "row" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: { backgroundColor: "#059669", marginLeft: 6 },
  assistantAvatar: { backgroundColor: "#d97706", marginRight: 6 },
  timestamp: { color: "#64748b", fontSize: 10 },
  messageBubble: { padding: 14, borderRadius: 18 },
  userMessageBubble: { backgroundColor: "#059669" },
  assistantMessageBubble: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userMessageText: { color: "#fff" },
  assistantMessageText: { color: "#0f172a" },
  ttsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ttsButtonActive: {
    backgroundColor: "#fee2e2",
  },
  ttsText: { color: "#059669", fontSize: 12, marginLeft: 4, fontWeight: "600" },
  miniWaveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 18,
    paddingHorizontal: 4,
  },
  waveBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#059669",
  },
  loadingContainer: { marginBottom: 12 },
  loadingBubble: {
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dcfce7",
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  speakingBar: {
    backgroundColor: "#ecfdf5",
    borderTopWidth: 1,
    borderTopColor: "#a7f3d0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stopSpeakingBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  listeningBanner: {
    backgroundColor: "#fef2f2",
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 20,
  },
  liveWaveBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#ef4444",
  },
  listeningText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  quickPromptsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0fdf4",
  },
  promptChip: {
    backgroundColor: "white",
    borderColor: "#86efac",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  promptChipText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
  },
  inputContent: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  textInputContainer: {
    flex: 1,
    maxHeight: 90,
    backgroundColor: "white",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  textInput: {
    color: "#0f172a",
    fontSize: 15,
    minHeight: 34,
    textAlignVertical: "top",
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  normalVoiceButton: { backgroundColor: "#059669" },
  listeningVoiceButton: { backgroundColor: "#ef4444" },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  activeSendButton: { backgroundColor: "#059669" },
  inactiveSendButton: { backgroundColor: "#e2e8f0" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingSection: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingLabel: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  settingDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  pillGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  pillActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#059669",
  },
  pillText: { fontSize: 12, color: "#475569" },
  pillTextActive: { fontSize: 12, color: "#065f46", fontWeight: "700" },
  testVoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  testVoiceText: { fontSize: 13, color: "#065f46", fontWeight: "600" },
  clearChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  clearChatText: { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  doneButton: {
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: { color: "white", fontSize: 15, fontWeight: "700" },
});
