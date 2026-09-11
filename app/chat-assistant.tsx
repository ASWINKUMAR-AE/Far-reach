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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import Voice from "@react-native-voice/voice";
import { ArrowLeft, Send, Mic, MicOff, Volume2, VolumeX, User, Bot, Sparkles } from "lucide-react-native";
import { askHositAI } from "@/lib/hositAI";
import { DEFAULT_FARMER, INITIAL_BOOKING, INITIAL_RECORD } from "@/lib/procurementService";

type ChatMessage = {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isPlaying?: boolean;
};

// ✅ Fixed API config in one place
const API_CONFIG = {
  key: "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",
  url: "https://openrouter.ai/api/v1/chat/completions",
  model: "deepseek/deepseek-chat-v3.1:free",
};

// ✅ Language list (added Santali)
const LANGUAGES = [
  { code: "en-US", name: "English" },
  { code: "hi-IN", name: "हिंदी (Hindi)" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
  { code: "te-IN", name: "తెలుగు (Telugu)" },
  { code: "bn-IN", name: "বাংলা (Bengali)" },
  { code: "ml-IN", name: "മലയാളം (Malayalam)" },
  { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)" },
  { code: "sat-IN", name: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)" }, // ✅ Added Santali
];

export default function ChatAssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content: "👋 Welcome! Select a language and ask about crops, soil, or weather.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // STT setup with safe check for Expo Go native module
  useEffect(() => {
    try {
      if (Voice && typeof Voice.onSpeechResults !== "undefined") {
        Voice.onSpeechResults = (e: any) => {
          const text = e?.value?.[0] ?? "";
          if (text) handleSendMessage(text);
          setIsListening(false);
        };
      }
    } catch (e) {
      console.log("[ChatAssistant] Voice module unavailable in Expo Go mode.");
    }
    return () => {
      try {
        if (Voice && typeof Voice.destroy === "function") {
          Voice.destroy().then(() => {
            if (Voice && typeof Voice.removeAllListeners === "function") {
              Voice.removeAllListeners();
            }
          }).catch(() => {});
        }
      } catch (e) {}
    };
  }, []);

  // Mic pulse animation
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const appendMessage = (msg: ChatMessage) =>
    setMessages((prev) => [...prev, msg]);

  const handleSendMessage = async (text?: string) => {
    const messageText = (text ?? inputText).trim();
    if (!messageText) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: messageText,
      timestamp: new Date(),
    };
    appendMessage(userMessage);
    setInputText("");
    setIsLoading(true);

    try {
      const reply = await askHositAI({
        message: messageText,
        userId: "F1021",
        context: `Far Reach Procurement Assistant (${selectedLang.name})`,
      });
      appendMessage({
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: reply,
        timestamp: new Date(),
      });
    } catch {
      appendMessage({
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: "⚠️ Error connecting to Far Reach AI service.",
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = async () => {
    try {
      if (!Voice || typeof Voice.start !== "function") {
        alert("Voice input requires a native build. Please type your message.");
        return;
      }
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      } else {
        await Voice.start(selectedLang.code);
        setIsListening(true);
      }
    } catch (e) {
      console.warn("Voice toggle error:", e);
      setIsListening(false);
    }
  };

  const cleanTextForTTS = (text: string) =>
    text.replace(/[\p{Emoji}\p{Symbol}\p{Punctuation}]+/gu, "").trim();

  const handleTTS = (id: string, text: string) => {
    const cleanText = cleanTextForTTS(text);
    if (!cleanText) return;

    setMessages((prev) =>
      prev.map((m) => ({ ...m, isPlaying: m.id === id ? !m.isPlaying : false }))
    );

    const msg = messages.find((m) => m.id === id);
    if (!msg?.isPlaying) {
      Speech.speak(cleanText, {
        language: selectedLang.code,
        onDone: stopAllTTS,
      });
    } else Speech.stop();
  };

  const stopAllTTS = () =>
    setMessages((prev) => prev.map((m) => ({ ...m, isPlaying: false })));

  // Quick Procurement Prompts
  const QUICK_PROMPTS = [
    "Where should I sell my paddy?",
    "Check my token & queue status",
    "Why was Samayapuram centre recommended?",
    "Check payment status for my crop",
    "What documents should I bring to mandi?",
  ];

  // ------------------ Far Reach Hosit AI Call ------------------
  const getDeepSeekResponse = async (text: string, languageName: string) => {
    const context = `Application: Far Reach Procurement OS (SIH26032)
Farmer Language: ${languageName}
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

Task: Answer the farmer's question concisely in simple ${languageName} appropriate for a rural Indian farmer.`;

    const response = await askHositAI({
      message: text,
      userId: DEFAULT_FARMER.id,
      context,
    });

    return response;
  };
  // -------------------------------------------------------

  const renderMessage = (item: ChatMessage) => {
    const isUser = item.type === "user";
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
              {isUser ? (
                <User size={16} color="white" />
              ) : (
                <Bot size={16} color="white" />
              )}
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
              isUser
                ? styles.userMessageBubble
                : styles.assistantMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser
                  ? styles.userMessageText
                  : styles.assistantMessageText,
              ]}
            >
              {item.content}
            </Text>
          </View>
          {!isUser && (
            <TouchableOpacity
              onPress={() => handleTTS(item.id, item.content)}
              style={styles.ttsButton}
            >
              {item.isPlaying ? (
                <VolumeX size={14} color="#059669" />
              ) : (
                <Volume2 size={14} color="#059669" />
              )}
              <Text style={styles.ttsText}>
                {item.isPlaying ? "Stop" : "Play"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#065f46" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>🌱 Crop Advisor</Text>
            <Text style={styles.headerSubtitle}>
              Voice + Multi-Language Assistant
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Language Selector */}
        <View style={styles.langContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => setSelectedLang(lang)}
                style={[
                  styles.langButton,
                  selectedLang.code === lang.code
                    ? styles.langButtonActive
                    : undefined,
                ]}
              >
                <Text
                  style={
                    selectedLang.code === lang.code
                      ? styles.langTextActive
                      : styles.langText
                  }
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages */}
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
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Procurement Prompts */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0fdf4' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSendMessage(prompt)}
                style={{
                  backgroundColor: 'white',
                  borderColor: '#86EFAC',
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginRight: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={12} color="#166534" />
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputContent}>
            <View style={styles.textInputContainer}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={`Type in ${selectedLang.name}...`}
                multiline
                style={styles.textInput}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={handleVoiceToggle}
                style={[
                  styles.voiceButton,
                  isListening
                    ? styles.listeningVoiceButton
                    : styles.normalVoiceButton,
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
              disabled={!inputText.trim()}
              style={[
                styles.sendButton,
                inputText.trim()
                  ? styles.activeSendButton
                  : styles.inactiveSendButton,
              ]}
            >
              <Send
                size={22}
                color={inputText.trim() ? "white" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#052e16", fontSize: 22, fontWeight: "bold" },
  headerSubtitle: { color: "#059669", fontSize: 14 },
  langContainer: { backgroundColor: "#f0fdf4", borderBottomWidth: 1, borderBottomColor: "#e0f2fe" },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dcfce7",
    marginRight: 8,
    justifyContent: "center",
  },
  langButtonActive: { backgroundColor: "#10b981", borderColor: "#10b981" },
  langText: { color: "#052e16" },
  langTextActive: { color: "#fff", fontWeight: "600" },
  messagesContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 8 },
  messageContainer: { flexDirection: "row", marginBottom: 20 },
  userMessageContainer: { justifyContent: "flex-end" },
  assistantMessageContainer: { justifyContent: "flex-start" },
  messageContent: { maxWidth: "80%" },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: { backgroundColor: "#10b981", marginLeft: 6 },
  assistantAvatar: { backgroundColor: "#f59e0b", marginRight: 6 },
  timestamp: { color: "#059669", fontSize: 11 },
  messageBubble: { padding: 14, borderRadius: 20 },
  userMessageBubble: { backgroundColor: "#10b981" },
  assistantMessageBubble: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  messageText: { fontSize: 15 },
  userMessageText: { color: "#fff" },
  assistantMessageText: { color: "#052e16" },
  ttsButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 14,
  },
  ttsText: { color: "#059669", fontSize: 12, marginLeft: 4 },
  loadingContainer: { marginBottom: 12 },
  loadingBubble: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dcfce7",
    alignSelf: "flex-start",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
  },
  inputContent: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  textInputContainer: {
    flex: 1,
    maxHeight: 96,
    backgroundColor: "white",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  textInput: {
    color: "#052e16",
    fontSize: 15,
    minHeight: 36,
    textAlignVertical: "top",
  },
  voiceButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  normalVoiceButton: { backgroundColor: "#10b981" },
  listeningVoiceButton: { backgroundColor: "#ef4444" },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  activeSendButton: { backgroundColor: "#10b981" },
  inactiveSendButton: { backgroundColor: "#dcfce7" },
});
