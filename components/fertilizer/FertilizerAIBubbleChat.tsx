import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import * as Speech from 'expo-speech';
import {
  MessageCircle,
  X,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Leaf,
  FlaskConical,
  Scale,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Bot,
  User,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import {
  computeFertilizerBlueprint,
  FarmingPreference,
  FertilizerRecommendationResult,
  SoilValues,
} from '@/lib/fertilizerAdvisorEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 600;

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text?: string;
  timestamp: string;
  isQuickReplies?: boolean;
  quickReplies?: { label: string; value: string; icon?: string }[];
  replyType?: 'crop' | 'unit' | 'area_number' | 'preference' | 'soil' | 'action';
  result?: FertilizerRecommendationResult;
}

const CROPS_LIST = [
  { label: 'Paddy (Rice)', value: 'Rice', icon: '🌾' },
  { label: 'Wheat', value: 'Wheat', icon: '🌱' },
  { label: 'Maize (Corn)', value: 'Maize', icon: '🌽' },
  { label: 'Tomato', value: 'Tomato', icon: '🍅' },
  { label: 'Potato', value: 'Potato', icon: '🥔' },
  { label: 'Cotton', value: 'Cotton', icon: '☁️' },
  { label: 'Groundnut', value: 'Groundnut', icon: '🥜' },
  { label: 'Sugarcane', value: 'Sugarcane', icon: '🎋' },
];

const PREFERENCES_LIST = [
  { label: '100% Organic', value: 'organic', icon: '🌿' },
  { label: 'Chemical (NPK)', value: 'chemical', icon: '🧪' },
  { label: 'Integrated Blend', value: 'both', icon: '⚖️' },
];

const SOIL_TYPES_LIST = [
  { label: 'Clay / Alluvial', value: 'clay', icon: '🧱' },
  { label: 'Loamy (Standard)', value: 'loam', icon: '🌱' },
  { label: 'Black Cotton Soil', value: 'black', icon: '⬛' },
  { label: 'Red / Sandy Loam', value: 'red', icon: '🏜️' },
];

export default function FertilizerAIBubbleChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [opacityAnim] = useState(new Animated.Value(0));

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  // Form conversation state
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<number>(0);
  const [selectedUnit, setSelectedUnit] = useState<'acres' | 'hectares'>('acres');
  const [selectedPreference, setSelectedPreference] = useState<FarmingPreference>('organic');
  const [step, setStep] = useState<
    'crop' | 'area_unit' | 'area_value' | 'preference' | 'soil' | 'calculated' | 'general'
  >('crop');

  const scrollViewRef = useRef<ScrollView>(null);

  // Pulse animation for floating bubble trigger
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Window open/close animation
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // If empty conversation, initialize welcome message
      if (messages.length === 0) {
        initWelcomeConversation();
      }
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Stop speech if open was closed
      try {
        Speech.stop();
        setIsSpeaking(false);
      } catch {}
    }
  }, [isOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping, isOpen]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {}
    };
  }, []);

  const getTimestamp = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const initWelcomeConversation = () => {
    setStep('crop');
    setSelectedCrop('');
    setSelectedArea(0);
    setSelectedUnit('acres');
    setSelectedPreference('organic');

    setMessages([
      {
        id: 'msg-1',
        sender: 'ai',
        text: '🌾 Namaste! I am your Kisan AI Fertilizer Assistant.\n\nI will calculate the exact scientific fertilizer dosage for your land. To start, which crop are you cultivating?',
        timestamp: getTimestamp(),
        isQuickReplies: true,
        replyType: 'crop',
        quickReplies: CROPS_LIST,
      },
    ]);
  };

  const handleReset = () => {
    try {
      Speech.stop();
      setIsSpeaking(false);
    } catch {}
    initWelcomeConversation();
  };

  // User selects a quick reply option
  const handleQuickReply = (value: string, label: string, replyType?: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: label,
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      processNextStep(value, label, replyType);
      setIsTyping(false);
    }, 600);
  };

  // Process state transitions based on interactive user answers
  const processNextStep = (value: string, label: string, replyType?: string) => {
    if (replyType === 'crop') {
      setSelectedCrop(value);
      setStep('area_value');

      const nextMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Great choice! For ${label}, what is the total area of your farmland?`,
        timestamp: getTimestamp(),
        isQuickReplies: true,
        replyType: 'area_number',
        quickReplies: [
          { label: '1 Acre', value: '1', icon: '📐' },
          { label: '2 Acres', value: '2', icon: '📐' },
          { label: '3 Acres', value: '3', icon: '📐' },
          { label: '5 Acres', value: '5', icon: '📐' },
          { label: '10 Acres', value: '10', icon: '📐' },
        ],
      };
      setMessages((prev) => [...prev, nextMsg]);
    } else if (replyType === 'area_number') {
      const areaNum = parseFloat(value) || 2;
      setSelectedArea(areaNum);
      setStep('preference');

      const nextMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Got it: ${areaNum} ${selectedUnit} of ${selectedCrop}.\n\nWhat is your farming preference?`,
        timestamp: getTimestamp(),
        isQuickReplies: true,
        replyType: 'preference',
        quickReplies: PREFERENCES_LIST,
      };
      setMessages((prev) => [...prev, nextMsg]);
    } else if (replyType === 'preference') {
      const pref = (value as FarmingPreference) || 'organic';
      setSelectedPreference(pref);
      setStep('soil');

      const nextMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Noted: ${label}.\n\nWhat is the primary soil type in your field?`,
        timestamp: getTimestamp(),
        isQuickReplies: true,
        replyType: 'soil',
        quickReplies: SOIL_TYPES_LIST,
      };
      setMessages((prev) => [...prev, nextMsg]);
    } else if (replyType === 'soil') {
      // Calculate exact prescription
      calculatePrescription(selectedCrop, selectedArea, selectedUnit, selectedPreference, value);
    }
  };

  // Perform agronomical calculation
  const calculatePrescription = (
    cropName: string,
    areaVal: number,
    unit: 'acres' | 'hectares',
    pref: FarmingPreference,
    soilKey: string
  ) => {
    // Standardize area in acres for engine
    const effectiveAcres = unit === 'hectares' ? areaVal * 2.47105 : areaVal;

    // Soil profile adjustment
    let soilValues: SoilValues = { N: 280, P: 18, K: 180, pH: 6.8 };
    if (soilKey === 'clay') {
      soilValues = { N: 310, P: 22, K: 220, pH: 7.2 };
    } else if (soilKey === 'black') {
      soilValues = { N: 260, P: 14, K: 250, pH: 7.6 };
    } else if (soilKey === 'red') {
      soilValues = { N: 220, P: 12, K: 140, pH: 6.2 };
    }

    const result = computeFertilizerBlueprint(cropName, effectiveAcres, soilValues, pref);
    setStep('calculated');

    const resultMsg: ChatMessage = {
      id: `ai-res-${Date.now()}`,
      sender: 'ai',
      text: `🎉 Analysis Complete! Here is the precise agronomical nutrient prescription calculated for your field:`,
      timestamp: getTimestamp(),
      result,
    };

    setMessages((prev) => [...prev, resultMsg]);
  };

  // Send typed text message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      // Conversational parsing: check if user provided a number for area
      const numMatch = text.match(/(\d+(\.\d+)?)/);
      const lower = text.toLowerCase();

      if (step === 'crop') {
        const matched = CROPS_LIST.find((c) => lower.includes(c.value.toLowerCase()));
        if (matched) {
          processNextStep(matched.value, matched.label, 'crop');
        } else {
          // Custom crop
          setSelectedCrop(text);
          setStep('area_value');
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: `Understood: ${text}. What is the total area of your land in Acres?`,
              timestamp: getTimestamp(),
              isQuickReplies: true,
              replyType: 'area_number',
              quickReplies: [
                { label: '1 Acre', value: '1', icon: '📐' },
                { label: '2 Acres', value: '2', icon: '📐' },
                { label: '3 Acres', value: '3', icon: '📐' },
                { label: '5 Acres', value: '5', icon: '📐' },
              ],
            },
          ]);
        }
      } else if (step === 'area_value' && numMatch) {
        processNextStep(numMatch[1], `${numMatch[1]} Acres`, 'area_number');
      } else if (step === 'preference') {
        if (lower.includes('organic') || lower.includes('natural') || lower.includes('bio')) {
          processNextStep('organic', '🌿 100% Organic', 'preference');
        } else if (lower.includes('chem') || lower.includes('urea') || lower.includes('npk')) {
          processNextStep('chemical', '🧪 Chemical (NPK)', 'preference');
        } else {
          processNextStep('both', '⚖️ Integrated Blend', 'preference');
        }
      } else {
        // General Q&A response
        handleGeneralAgriQuestion(text);
      }
      setIsTyping(false);
    }, 800);
  };

  const handleGeneralAgriQuestion = (question: string) => {
    const q = question.toLowerCase();
    let reply = `For optimal crop nourishment, apply organic manure 2-3 weeks before sowing to improve soil humus and moisture retention.`;

    if (q.includes('dap') || q.includes('phosphorus')) {
      reply = `Di-Ammonium Phosphate (DAP 18:46:0) is a basal fertilizer. It should always be incorporated deep into the root zone before or at sowing time, because Phosphorus has very low mobility in soil.`;
    } else if (q.includes('urea') || q.includes('nitrogen')) {
      reply = `Neem-Coated Urea (46% N) must always be applied in 2-3 split doses (active tillering and panicle initiation). Never apply urea in standing water or during peak afternoon sunlight.`;
    } else if (q.includes('organic') || q.includes('vermicompost') || q.includes('neem')) {
      reply = `Vermicompost provides rich organic carbon and active microbial flora. Neem cake inhibits nitrification bacteria, making nitrogen available slowly while naturally repelling root nematodes and termites.`;
    } else if (q.includes('potash') || q.includes('mop')) {
      reply = `MOP (Muriate of Potash, 60% K2O) improves stem strength, drought resistance, disease resilience, and grain filling. Split application at panicle emergence yields high test weight.`;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: getTimestamp(),
      },
    ]);
  };

  // Text-to-Speech handler for prescription card
  const handleToggleSpeak = (msgId: string, prescriptionText: string) => {
    if (isSpeaking && activeSpeechId === msgId) {
      Speech.stop();
      setIsSpeaking(false);
      setActiveSpeechId(null);
      return;
    }

    try {
      Speech.stop();
      setIsSpeaking(true);
      setActiveSpeechId(msgId);

      Speech.speak(prescriptionText, {
        language: 'en-IN',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => {
          setIsSpeaking(false);
          setActiveSpeechId(null);
        },
        onError: () => {
          setIsSpeaking(false);
          setActiveSpeechId(null);
        },
      });
    } catch (e) {
      setIsSpeaking(false);
      setActiveSpeechId(null);
    }
  };

  return (
    <>
      {/* 1. FLOATING CHAT BUBBLE TRIGGER */}
      {!isOpen && (
        <View style={styles.bubbleContainer}>
          {/* Helper Tooltip Pill */}
          <TouchableOpacity
            style={styles.tooltipPill}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.85}
          >
            <Sparkles size={12} color="#059669" />
            <Text style={styles.tooltipPillText}>Calculate Land Fertilizer AI</Text>
          </TouchableOpacity>

          {/* Glowing Circular Avatar Bubble */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.floatingBubble}
              onPress={() => setIsOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.bubbleIconWrap}>
                <Bot size={28} color="#FFFFFF" />
              </View>
              <View style={styles.onlineBadge} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* 2. EXPANDABLE MINI CHAT WINDOW */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatWindow,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* A. Chat Header */}
          <View style={styles.chatHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.botAvatarBadge}>
                <Bot size={20} color="#FFFFFF" />
                <View style={styles.miniOnlineDot} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>Kisan Agri-AI</Text>
                  <View style={styles.headerPill}>
                    <Text style={styles.headerPillText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>Fertilizer Land Dosage Calculator</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleReset}
                style={styles.headerActionBtn}
                accessibilityLabel="Restart conversation"
              >
                <RotateCcw size={16} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.headerActionBtn}
                accessibilityLabel="Close mini chat"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* B. Chat Conversation Messages ScrollView */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatBody}
            contentContainerStyle={styles.chatBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isAi ? styles.messageRowAi : styles.messageRowUser,
                  ]}
                >
                  {isAi && (
                    <View style={styles.msgAvatarAi}>
                      <Bot size={14} color="#FFFFFF" />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isAi ? styles.messageBubbleAi : styles.messageBubbleUser,
                    ]}
                  >
                    {msg.text && (
                      <Text
                        style={[
                          styles.messageText,
                          isAi ? styles.messageTextAi : styles.messageTextUser,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    )}

                    {/* RICH PRESCRIPTION RESULT CARD */}
                    {msg.result && (
                      <View style={styles.prescriptionCard}>
                        {/* Card Header */}
                        <View style={styles.pcHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Leaf size={16} color="#059669" />
                            <Text style={styles.pcTitle}>
                              {msg.result.crop} • {msg.result.areaAcres.toFixed(1)} Acres
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.pcBadge,
                              msg.result.preference === 'organic'
                                ? styles.pcBadgeOrganic
                                : msg.result.preference === 'chemical'
                                ? styles.pcBadgeChemical
                                : styles.pcBadgeIntegrated,
                            ]}
                          >
                            <Text style={styles.pcBadgeText}>
                              {msg.result.preference === 'organic'
                                ? '100% Organic'
                                : msg.result.preference === 'chemical'
                                ? 'Chemical NPK'
                                : 'Integrated'}
                            </Text>
                          </View>
                        </View>

                        {/* Target Nutrients Banner */}
                        <View style={styles.targetNutrientsRow}>
                          <Text style={styles.targetNutrientTitle}>Target Nutrients Needed:</Text>
                          <View style={styles.nutrientChips}>
                            <Text style={styles.nutrientChipN}>N: {msg.result.targetNutrientsKg.N} kg</Text>
                            <Text style={styles.nutrientChipP}>P: {msg.result.targetNutrientsKg.P} kg</Text>
                            <Text style={styles.nutrientChipK}>K: {msg.result.targetNutrientsKg.K} kg</Text>
                          </View>
                        </View>

                        {/* Prescribed Fertilizers List */}
                        <View style={styles.fertilizersList}>
                          <Text style={styles.fertListSectionTitle}>Recommended Exact Quantity:</Text>

                          {msg.result.preference === 'organic' || msg.result.preference === 'both' ? (
                            <View style={styles.fertGroup}>
                              <Text style={styles.fertGroupHeader}>🌿 Natural & Bio Prescriptions:</Text>
                              {msg.result.organicOptions.slice(0, 4).map((opt, oIdx) => (
                                <View key={oIdx} style={styles.fertRow}>
                                  <CheckCircle2 size={13} color="#059669" style={{ marginTop: 2 }} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.fertName}>{opt.fertilizerName}</Text>
                                    <Text style={styles.fertQty}>{opt.quantityFormatted}</Text>
                                    <Text style={styles.fertPurpose}>{opt.purpose}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : null}

                          {msg.result.preference === 'chemical' || msg.result.preference === 'both' ? (
                            <View style={styles.fertGroup}>
                              <Text style={styles.fertGroupHeader}>🧪 Standard Mineral Dosages:</Text>
                              {msg.result.chemicalOptions.map((opt, cIdx) => (
                                <View key={cIdx} style={styles.fertRow}>
                                  <CheckCircle2 size={13} color="#2563EB" style={{ marginTop: 2 }} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.fertName}>{opt.fertilizerName}</Text>
                                    <Text style={styles.fertQty}>
                                      {opt.quantityKg} kg ({opt.bags50kg} bags)
                                    </Text>
                                    <Text style={styles.fertPurpose}>{opt.timing}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>

                        {/* Split Application Timeline Highlight */}
                        <View style={styles.splitBox}>
                          <Text style={styles.splitBoxTitle}>📅 Split Schedule (Basal & Top Dressing):</Text>
                          {msg.result.splitSchedule.map((stg, sIdx) => (
                            <View key={sIdx} style={styles.splitItem}>
                              <Text style={styles.splitStageName}>
                                {sIdx + 1}. {stg.stage} ({stg.timeframe}):
                              </Text>
                              <Text style={styles.splitStageDesc}>
                                {msg.result?.preference === 'organic'
                                  ? stg.organicRecommendation
                                  : stg.chemicalRecommendation}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* TTS Voice Readout & Reset Buttons */}
                        <View style={styles.pcFooter}>
                          <TouchableOpacity
                            style={[
                              styles.ttsButton,
                              isSpeaking && activeSpeechId === msg.id && styles.ttsButtonActive,
                            ]}
                            onPress={() => {
                              const readText = `Prescription for ${msg.result?.areaAcres} acres of ${msg.result?.crop}. Target nutrients: Nitrogen ${msg.result?.targetNutrientsKg.N} kilograms, Phosphorus ${msg.result?.targetNutrientsKg.P} kilograms, Potassium ${msg.result?.targetNutrientsKg.K} kilograms. Split schedule: Stage one basal, apply organic manure and phosphate before sowing. Top dress with nitrogen during tillering.`;
                              handleToggleSpeak(msg.id, readText);
                            }}
                          >
                            {isSpeaking && activeSpeechId === msg.id ? (
                              <VolumeX size={15} color="#FFFFFF" />
                            ) : (
                              <Volume2 size={15} color="#059669" />
                            )}
                            <Text
                              style={[
                                styles.ttsButtonText,
                                isSpeaking && activeSpeechId === msg.id && styles.ttsButtonTextActive,
                              ]}
                            >
                              {isSpeaking && activeSpeechId === msg.id ? 'Stop Audio' : 'Listen Prescription'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.calcAgainBtn}
                            onPress={handleReset}
                          >
                            <RotateCcw size={13} color="#065F46" />
                            <Text style={styles.calcAgainText}>New Field</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Quick Replies Buttons */}
                    {msg.isQuickReplies && msg.quickReplies && (
                      <View style={styles.quickRepliesContainer}>
                        {msg.quickReplies.map((qr, qIdx) => (
                          <TouchableOpacity
                            key={qIdx}
                            style={styles.quickReplyChip}
                            onPress={() => handleQuickReply(qr.value, `${qr.icon || ''} ${qr.label}`, msg.replyType)}
                          >
                            {qr.icon && <Text style={{ fontSize: 13, marginRight: 4 }}>{qr.icon}</Text>}
                            <Text style={styles.quickReplyText}>{qr.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.msgTimestamp,
                        isAi ? styles.msgTimestampAi : styles.msgTimestampUser,
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <View style={[styles.messageRow, styles.messageRowAi]}>
                <View style={styles.msgAvatarAi}>
                  <Bot size={14} color="#FFFFFF" />
                </View>
                <View style={[styles.messageBubble, styles.messageBubbleAi, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.typingText}>Calculating agronomical formula...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* C. Chat Input Bar */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            <View style={styles.inputBar}>
              <TextInput
                style={styles.inputField}
                placeholder="Ask about crops, land area, dosages..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim() ? styles.sendButtonActive : styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <Send size={16} color={inputText.trim() ? '#FFFFFF' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // 1. Floating Bubble Styles
  bubbleContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  tooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  tooltipPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  floatingBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  bubbleIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // 2. Expandable Mini Chat Window Styles
  chatWindow: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: IS_MOBILE ? SCREEN_WIDTH * 0.92 : 390,
    height: Math.min(580, SCREEN_HEIGHT * 0.8),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  // A. Header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  headerPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // B. Body Messages
  chatBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatBodyContent: {
    padding: 12,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginVertical: 2,
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  msgAvatarAi: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageBubbleAi: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  messageBubbleUser: {
    backgroundColor: '#059669',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextAi: {
    color: '#1E293B',
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  msgTimestamp: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimestampAi: {
    color: '#94A3B8',
  },
  msgTimestampUser: {
    color: '#DCFCE7',
  },

  // Quick Reply Chips
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickReplyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },

  // Typing state
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },

  // Prescription Result Card inside Chat
  prescriptionCard: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    padding: 12,
  },
  pcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  pcTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  pcBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pcBadgeOrganic: { backgroundColor: '#DCFCE7' },
  pcBadgeChemical: { backgroundColor: '#DBEAFE' },
  pcBadgeIntegrated: { backgroundColor: '#FEF3C7' },
  pcBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  targetNutrientsRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  targetNutrientTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  nutrientChips: {
    flexDirection: 'row',
    gap: 6,
  },
  nutrientChipN: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nutrientChipP: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nutrientChipK: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fertilizersList: {
    marginBottom: 8,
  },
  fertListSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  fertGroup: {
    marginBottom: 6,
  },
  fertGroupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  fertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fertName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  fertQty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  fertPurpose: {
    fontSize: 10,
    color: '#64748B',
  },
  splitBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splitBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  splitItem: {
    marginBottom: 3,
  },
  splitStageName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  splitStageDesc: {
    fontSize: 10,
    color: '#475569',
  },
  pcFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ttsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingVertical: 7,
  },
  ttsButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  ttsButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  ttsButtonTextActive: {
    color: '#FFFFFF',
  },
  calcAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  calcAgainText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },

  // C. Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#059669',
  },
  sendButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
});
