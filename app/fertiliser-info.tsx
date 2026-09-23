import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import {
  ArrowLeft,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Square,
  Globe,
  Calculator,
  Leaf,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sprout,
  Check,
  RotateCcw,
  BookOpen,
  Share2,
} from 'lucide-react-native';

import {
  FERTILIZER_DATABASE,
  COMMON_CROPS_DATABASE,
  SCIENTIFIC_RESEARCH_HIGHLIGHTS,
  FERTILIZER_IMAGES,
  calculateFertilizerRequirement,
  FertilizerKnowledge,
  CropDosageStandard,
} from '@/lib/fertilizerKnowledgeData';
import { translateText } from '@/lib/translationService';
import FertilizerAIBubbleChat from '@/components/fertilizer/FertilizerAIBubbleChat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH > 768;

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', voiceCode: 'en-IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', voiceCode: 'ta-IN' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', voiceCode: 'hi-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', voiceCode: 'ml-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', voiceCode: 'kn-IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', voiceCode: 'te-IN' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', voiceCode: 'bn-IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', voiceCode: 'mr-IN' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', voiceCode: 'gu-IN' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', voiceCode: 'pa-IN' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Fertilizers' },
  { id: 'nitrogen', label: 'Nitrogen (N)' },
  { id: 'phosphorus', label: 'Phosphorus (P)' },
  { id: 'potassium', label: 'Potassium (K)' },
  { id: 'complex', label: 'Complex NPK' },
  { id: 'organic', label: '100% Organic' },
  { id: 'micronutrient', label: 'Micronutrients' },
];

type CardTab = 'science' | 'dosage' | 'application' | 'safety';

export default function FertiliserInfoScreen() {
  const router = useRouter();

  // Language & Translation State
  const [selectedLang, setSelectedLang] = useState(AVAILABLE_LANGUAGES[0]);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});

  // TTS State
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ttsSpeechRate, setTtsSpeechRate] = useState<number>(1.0);
  const soundRef = useRef<any>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Active Tab per Card
  const [activeTabs, setActiveTabs] = useState<Record<string, CardTab>>({});

  // Calculator State
  const [calcCrop, setCalcCrop] = useState<string>('rice');
  const [calcArea, setCalcArea] = useState<string>('2');
  const [calcUnit, setCalcUnit] = useState<'acre' | 'hectare' | 'bigha' | 'guntha'>('acre');
  const [isCropDropdownOpen, setIsCropDropdownOpen] = useState(false);

  // Selected Detail Modal
  const [selectedFertilizerForModal, setSelectedFertilizerForModal] = useState<FertilizerKnowledge | null>(null);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stopAllTTS();
    };
  }, []);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  // Safe TTS Player
  const stopAllTTS = () => {
    try {
      Speech.stop();
    } catch {}
    if (soundRef.current) {
      try {
        if (Platform.OS === 'web') {
          soundRef.current.pause();
          soundRef.current.currentTime = 0;
        } else {
          soundRef.current.stopAsync();
          soundRef.current.unloadAsync();
        }
      } catch {}
      soundRef.current = null;
    }
    setSpeakingId(null);
  };

  const playTTS = async (id: string, textToSpeak: string) => {
    triggerHaptic('medium');

    if (speakingId === id) {
      stopAllTTS();
      return;
    }

    stopAllTTS();
    setSpeakingId(id);

    // Clean text for natural speech synthesis
    const clean = textToSpeak
      .replace(/[#*`_~]/g, '')
      .replace(/[\(\)\[\]]/g, ', ')
      .replace(/[\p{Emoji}\p{Symbol}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    // First attempt: Native Expo Speech with localized language code
    try {
      const isSpeakingAvailable = await Speech.isSpeakingAsync().catch(() => false);
      if (isSpeakingAvailable) await Speech.stop();

      Speech.speak(clean, {
        language: selectedLang.voiceCode,
        rate: ttsSpeechRate,
        pitch: 1.0,
        onDone: () => setSpeakingId(null),
        onStopped: () => setSpeakingId(null),
        onError: () => {
          fallbackGoogleTTS(clean, selectedLang.code);
        },
      });
    } catch {
      fallbackGoogleTTS(clean, selectedLang.code);
    }
  };

  const fallbackGoogleTTS = async (cleanText: string, langCode: string) => {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        cleanText.substring(0, 200)
      )}&tl=${langCode}&client=tw-ob`;

      if (Platform.OS === 'web') {
        const audio = new window.Audio(url);
        soundRef.current = audio;
        audio.onended = () => setSpeakingId(null);
        await audio.play();
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setSpeakingId(null);
          }
        });
      }
    } catch {
      setSpeakingId(null);
    }
  };

  // Switch Language
  const handleSelectLanguage = async (lang: typeof AVAILABLE_LANGUAGES[0]) => {
    triggerHaptic();
    setSelectedLang(lang);
    setIsLangModalOpen(false);
    stopAllTTS();

    if (lang.code === 'en') {
      setDynamicTranslations({});
      return;
    }

    // Translate dynamic headings on the fly if needed
    setTranslating(true);
    try {
      const sampleGreeting = `Fertiliser Info hub loaded in ${lang.native}`;
      const translated = await translateText(sampleGreeting, 'en', lang.code);
      setDynamicTranslations((prev) => ({ ...prev, headerBanner: translated }));
    } catch {}
    setTranslating(false);
  };

  // Localized text helper
  const getLocalizedFertilizerName = (item: FertilizerKnowledge) => {
    return item.localNames[selectedLang.code] || item.name;
  };

  const getLocalizedCropName = (crop: CropDosageStandard) => {
    return crop.localCropNames[selectedLang.code] || crop.cropName;
  };

  // Filtered Fertilizers
  const filteredFertilizers = useMemo(() => {
    return FERTILIZER_DATABASE.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const localizedName = getLocalizedFertilizerName(item).toLowerCase();
      const rawName = item.name.toLowerCase();
      const npk = item.npkFormula.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        localizedName.includes(q) || rawName.includes(q) || npk.includes(q) || item.tagline.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, selectedLang]);

  // Current Card Tab
  const getCardTab = (id: string): CardTab => activeTabs[id] || 'science';
  const setCardTab = (id: string, tab: CardTab) => {
    triggerHaptic();
    setActiveTabs((prev) => ({ ...prev, [id]: tab }));
  };

  // Calculated Requirement
  const parsedArea = parseFloat(calcArea) || 1;
  const calculatedDosage = useMemo(() => {
    return calculateFertilizerRequirement(calcCrop, parsedArea, calcUnit);
  }, [calcCrop, parsedArea, calcUnit]);

  const activeCropObj = useMemo(() => {
    return COMMON_CROPS_DATABASE.find((c) => c.cropId === calcCrop) || COMMON_CROPS_DATABASE[0];
  }, [calcCrop]);

  // Read Aloud for Calculator
  const handleReadCalculatorResults = () => {
    const cropName = getLocalizedCropName(activeCropObj);
    const summary = `Fertilizer dosage for ${parsedArea} ${calcUnit} of ${cropName}: You need ${calculatedDosage.fertilizers.urea.bags50kg} bags (${calculatedDosage.fertilizers.urea.kg} kg) of Neem Coated Urea, ${calculatedDosage.fertilizers.dap.bags50kg} bags (${calculatedDosage.fertilizers.dap.kg} kg) of DAP, and ${calculatedDosage.fertilizers.mop.bags50kg} bags (${calculatedDosage.fertilizers.mop.kg} kg) of MOP Potash. Basal Dose: 100% DAP and 50% Potash at sowing.`;
    playTTS('calculator_tts', summary);
  };

  const handleShareArticle = async (item: FertilizerKnowledge) => {
    triggerHaptic();
    try {
      await Share.share({
        title: `${item.name} - Agronomic Guide`,
        message: `🌱 ${item.name} (${item.npkFormula})\n${item.tagline}\nRecommended Acre Dose: ${item.dosages.generalPerAcre}\nLearn more on Far-Reach Fertilizer Intelligence.`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Website-Style Navigation Header */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color="#166534" />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navBadge}>AGRONOMIC INTELLIGENCE</Text>
          <Text style={styles.navTitle}>FERTILISER INFO</Text>
        </View>

        <TouchableOpacity
          style={styles.langSelectorBtn}
          onPress={() => setIsLangModalOpen(true)}
          accessibilityLabel="Change language"
        >
          <Globe size={18} color="#166534" />
          <Text style={styles.langSelectorText}>{selectedLang.native}</Text>
          <ChevronDown size={14} color="#166534" />
        </TouchableOpacity>
      </View>

      {/* Floating Global Audio Player Bar (when speaking) */}
      {speakingId && (
        <View style={styles.floatingAudioBar}>
          <View style={styles.audioBarLeft}>
            <View style={styles.audioWavePulse} />
            <Volume2 size={18} color="#FFFFFF" />
            <Text style={styles.audioBarText} numberOfLines={1}>
              Speaking in {selectedLang.native}...
            </Text>
          </View>
          <View style={styles.audioBarControls}>
            <TouchableOpacity
              style={styles.audioSpeedBtn}
              onPress={() => {
                triggerHaptic();
                setTtsSpeechRate((r) => (r === 1.0 ? 1.2 : r === 1.2 ? 0.8 : 1.0));
              }}
            >
              <Text style={styles.audioSpeedText}>{ttsSpeechRate}x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.audioStopBtn} onPress={stopAllTTS}>
              <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO WEBSITE SECTION */}
        <LinearGradient
          colors={['#065F46', '#047857', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Sparkles size={12} color="#A7F3D0" />
              <Text style={styles.heroPillText}>ICAR & FAO Standards</Text>
            </View>
            <View style={styles.heroPill}>
              <Volume2 size={12} color="#A7F3D0" />
              <Text style={styles.heroPillText}>Multi-Lingual Audio Narration</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Comprehensive Fertiliser Encyclopedia & Dosage Hub</Text>
          <Text style={styles.heroSubtitle}>
            Scientifically validated crop nutrition, biochemical action mechanisms, and exact bag calculators
            per hectare and acre.
          </Text>

          {/* Quick Stats Grid */}
          <View style={styles.heroStatsGrid}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>6+</Text>
              <Text style={styles.heroStatLabel}>Major Nutrients</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>10+</Text>
              <Text style={styles.heroStatLabel}>Prime Crops</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>100%</Text>
              <Text style={styles.heroStatLabel}>Peer-Reviewed</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>10</Text>
              <Text style={styles.heroStatLabel}>Regional Voices</Text>
            </View>
          </View>
        </LinearGradient>

        {/* INTERACTIVE DOSAGE CALCULATOR SECTION */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <Calculator size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Fertilizer Dosage Calculator</Text>
          </View>
          <TouchableOpacity
            style={styles.listenSectionBtn}
            onPress={handleReadCalculatorResults}
            accessibilityLabel="Listen to calculated dosages"
          >
            {speakingId === 'calculator_tts' ? (
              <VolumeX size={16} color="#DC2626" />
            ) : (
              <Volume2 size={16} color="#059669" />
            )}
            <Text
              style={[
                styles.listenSectionText,
                speakingId === 'calculator_tts' && { color: '#DC2626' },
              ]}
            >
              {speakingId === 'calculator_tts' ? 'Stop Voice' : 'Listen'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calculatorCard}>
          <Text style={styles.calculatorSubtitle}>
            Select your crop and field area to calculate exact fertilizer bags (50kg each) and split application
            timelines.
          </Text>

          {/* Crop Selector Chips */}
          <Text style={styles.inputLabel}>Select Cultivated Crop</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cropChipsScroll}
          >
            {COMMON_CROPS_DATABASE.map((c) => {
              const isSelected = c.cropId === calcCrop;
              return (
                <TouchableOpacity
                  key={c.cropId}
                  style={[styles.cropChip, isSelected && styles.cropChipActive]}
                  onPress={() => {
                    triggerHaptic();
                    setCalcCrop(c.cropId);
                  }}
                >
                  <Text style={styles.cropChipIcon}>{c.icon}</Text>
                  <Text
                    style={[styles.cropChipText, isSelected && styles.cropChipTextActive]}
                  >
                    {getLocalizedCropName(c)}
                  </Text>
                  {isSelected && <Check size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Area Input & Unit Row */}
          <View style={styles.areaInputRow}>
            <View style={styles.areaInputBox}>
              <Text style={styles.inputLabel}>Land Area</Text>
              <TextInput
                style={styles.numericTextInput}
                keyboardType="numeric"
                value={calcArea}
                onChangeText={(t) => setCalcArea(t)}
                placeholder="e.g. 2.5"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.unitSelectorBox}>
              <Text style={styles.inputLabel}>Land Unit</Text>
              <View style={styles.unitPillsRow}>
                {(['acre', 'hectare', 'bigha', 'guntha'] as const).map((unit) => {
                  const isUnitSelected = calcUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitPill,
                        isUnitSelected && styles.unitPillActive,
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setCalcUnit(unit);
                      }}
                    >
                      <Text
                        style={[
                          styles.unitPillText,
                          isUnitSelected && styles.unitPillTextActive,
                        ]}
                      >
                        {unit.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Dynamic Land Equivalence Banner */}
          <View style={styles.landEquivBanner}>
            <Info size={16} color="#0284C7" />
            <Text style={styles.landEquivText}>
              {parsedArea} {calcUnit.toUpperCase()} ={' '}
              <Text style={{ fontWeight: '700' }}>
                {calculatedDosage.totalAcres} Acres
              </Text>{' '}
              ( {calculatedDosage.totalHectares} Hectares ) • Standard NPK Target:{' '}
              {activeCropObj.npkRatio}
            </Text>
          </View>

          {/* Live Calculated Bags Grid */}
          <View style={styles.dosageResultsGrid}>
            {/* Neem Urea */}
            <View style={[styles.dosageCard, { borderColor: '#86EFAC' }]}>
              <View style={styles.dosageCardTop}>
                <View
                  style={[styles.dosageBadge, { backgroundColor: '#DCFCE7' }]}
                >
                  <Text style={[styles.dosageBadgeText, { color: '#166534' }]}>
                    NITROGEN
                  </Text>
                </View>
                <Text style={styles.dosageBagCount}>
                  {calculatedDosage.fertilizers.urea.bags50kg}{' '}
                  <Text style={styles.dosageUnit}>Bags</Text>
                </Text>
              </View>
              <Text style={styles.dosageFertName}>Neem Coated Urea</Text>
              <Text style={styles.dosageKgText}>
                {calculatedDosage.fertilizers.urea.kg} kg total
              </Text>
              <Text style={styles.dosageTimingNote}>
                {calculatedDosage.fertilizers.urea.timing}
              </Text>
            </View>

            {/* DAP */}
            <View style={[styles.dosageCard, { borderColor: '#93C5FD' }]}>
              <View style={styles.dosageCardTop}>
                <View
                  style={[styles.dosageBadge, { backgroundColor: '#DBEAFE' }]}
                >
                  <Text style={[styles.dosageBadgeText, { color: '#1D4ED8' }]}>
                    PHOSPHORUS
                  </Text>
                </View>
                <Text style={styles.dosageBagCount}>
                  {calculatedDosage.fertilizers.dap.bags50kg}{' '}
                  <Text style={styles.dosageUnit}>Bags</Text>
                </Text>
              </View>
              <Text style={styles.dosageFertName}>DAP (18-46-0)</Text>
              <Text style={styles.dosageKgText}>
                {calculatedDosage.fertilizers.dap.kg} kg total
              </Text>
              <Text style={styles.dosageTimingNote}>
                {calculatedDosage.fertilizers.dap.timing}
              </Text>
            </View>

            {/* MOP Potash */}
            <View style={[styles.dosageCard, { borderColor: '#FDE68A' }]}>
              <View style={styles.dosageCardTop}>
                <View
                  style={[styles.dosageBadge, { backgroundColor: '#FEF3C7' }]}
                >
                  <Text style={[styles.dosageBadgeText, { color: '#B45309' }]}>
                    POTASSIUM
                  </Text>
                </View>
                <Text style={styles.dosageBagCount}>
                  {calculatedDosage.fertilizers.mop.bags50kg}{' '}
                  <Text style={styles.dosageUnit}>Bags</Text>
                </Text>
              </View>
              <Text style={styles.dosageFertName}>MOP (0-0-60)</Text>
              <Text style={styles.dosageKgText}>
                {calculatedDosage.fertilizers.mop.kg} kg total
              </Text>
              <Text style={styles.dosageTimingNote}>
                {calculatedDosage.fertilizers.mop.timing}
              </Text>
            </View>

            {/* Organic Compost */}
            <View style={[styles.dosageCard, { borderColor: '#A7F3D0' }]}>
              <View style={styles.dosageCardTop}>
                <View
                  style={[styles.dosageBadge, { backgroundColor: '#D1FAE5' }]}
                >
                  <Text style={[styles.dosageBadgeText, { color: '#047857' }]}>
                    SOIL CARBON
                  </Text>
                </View>
                <Text style={styles.dosageBagCount}>
                  {calculatedDosage.fertilizers.vermicompost.tonnes}{' '}
                  <Text style={styles.dosageUnit}>Tons</Text>
                </Text>
              </View>
              <Text style={styles.dosageFertName}>Vermicompost</Text>
              <Text style={styles.dosageKgText}>
                {calculatedDosage.fertilizers.vermicompost.kg} kg total
              </Text>
              <Text style={styles.dosageTimingNote}>
                {calculatedDosage.fertilizers.vermicompost.timing}
              </Text>
            </View>
          </View>

          {/* Split Application Schedule Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeader}>
              <Calendar size={18} color="#059669" />
              <Text style={styles.timelineTitle}>
                Split Application Schedule for {getLocalizedCropName(activeCropObj)}
              </Text>
            </View>

            {calculatedDosage.splitSchedule.map((item, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDotLine}>
                  <View style={styles.timelineDot}>
                    <Text style={styles.timelineDotNumber}>{idx + 1}</Text>
                  </View>
                  {idx < calculatedDosage.splitSchedule.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineStageHeader}>
                    <Text style={styles.timelineStageName}>{item.stageName}</Text>
                    <Text style={styles.timelineTimeframe}>{item.timeframe}</Text>
                  </View>
                  <Text style={styles.timelineInstruction}>{item.instruction}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SEARCH AND CATEGORY FILTER BAR */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search fertilizer by name, NPK, formula..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <RotateCcw size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                  onPress={() => {
                    triggerHaptic();
                    setActiveCategory(cat.id);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isActive && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* FERTILIZER ENCYCLOPEDIA CARDS */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <FlaskConical size={22} color="#059669" />
            <Text style={styles.sectionTitle}>
              Fertiliser Profiles & Scientific Proofs ({filteredFertilizers.length})
            </Text>
          </View>
        </View>

        {filteredFertilizers.map((item) => {
          const currentTab = getCardTab(item.id);
          const isItemSpeaking = speakingId === item.id;
          const imageSource = FERTILIZER_IMAGES[item.imageKey] || FERTILIZER_IMAGES.urea;

          const cardTTSContent = `${getLocalizedFertilizerName(item)}. NPK Formula ${
            item.npkFormula
          }. Category: ${item.categoryLabel}. Tagline: ${item.tagline}. Description: ${
            item.description
          }. Biochemical Action: ${item.scientificProof.biochemicalRole}. Field Research: ${
            item.scientificProof.citations[0]?.finding || ''
          }. Standard dosage: ${item.dosages.generalPerAcre}.`;

          return (
            <View key={item.id} style={styles.encyclopediaCard}>
              {/* Card Image Banner */}
              <View style={styles.cardImageContainer}>
                <Image
                  source={imageSource}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.cardImageOverlay}
                >
                  <View style={styles.cardHeaderTopRow}>
                    <View
                      style={[
                        styles.npkPill,
                        { backgroundColor: item.themeColor },
                      ]}
                    >
                      <Text style={styles.npkPillText}>NPK {item.npkFormula}</Text>
                    </View>

                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleShareArticle(item)}
                        accessibilityLabel="Share this fertilizer guide"
                      >
                        <Share2 size={16} color="#FFFFFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.cardAudioBtn,
                          isItemSpeaking && { backgroundColor: '#DC2626' },
                        ]}
                        onPress={() => playTTS(item.id, cardTTSContent)}
                        accessibilityLabel="Listen to this fertilizer in selected language"
                      >
                        {isItemSpeaking ? (
                          <VolumeX size={16} color="#FFFFFF" />
                        ) : (
                          <Volume2 size={16} color="#FFFFFF" />
                        )}
                        <Text style={styles.cardAudioBtnText}>
                          {isItemSpeaking ? 'Stop' : 'Listen'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View>
                    <Text style={styles.cardCategoryText}>{item.categoryLabel}</Text>
                    <Text style={styles.cardTitleText}>
                      {getLocalizedFertilizerName(item)}
                    </Text>
                    <Text style={styles.cardChemicalText}>
                      {item.chemicalFormula}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Tagline & Overview */}
              <View style={styles.cardBody}>
                <Text style={styles.cardTagline}>{item.tagline}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>

                {/* Sub-Tabs Selector */}
                <View style={styles.cardTabsRow}>
                  <TouchableOpacity
                    style={[
                      styles.cardTabBtn,
                      currentTab === 'science' && styles.cardTabBtnActive,
                    ]}
                    onPress={() => setCardTab(item.id, 'science')}
                  >
                    <FlaskConical
                      size={14}
                      color={currentTab === 'science' ? '#059669' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.cardTabBtnText,
                        currentTab === 'science' && styles.cardTabBtnTextActive,
                      ]}
                    >
                      Scientific Proof
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cardTabBtn,
                      currentTab === 'dosage' && styles.cardTabBtnActive,
                    ]}
                    onPress={() => setCardTab(item.id, 'dosage')}
                  >
                    <Calculator
                      size={14}
                      color={currentTab === 'dosage' ? '#059669' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.cardTabBtnText,
                        currentTab === 'dosage' && styles.cardTabBtnTextActive,
                      ]}
                    >
                      Land Dosages
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cardTabBtn,
                      currentTab === 'application' && styles.cardTabBtnActive,
                    ]}
                    onPress={() => setCardTab(item.id, 'application')}
                  >
                    <Calendar
                      size={14}
                      color={currentTab === 'application' ? '#059669' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.cardTabBtnText,
                        currentTab === 'application' && styles.cardTabBtnTextActive,
                      ]}
                    >
                      Application
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cardTabBtn,
                      currentTab === 'safety' && styles.cardTabBtnActive,
                    ]}
                    onPress={() => setCardTab(item.id, 'safety')}
                  >
                    <ShieldCheck
                      size={14}
                      color={currentTab === 'safety' ? '#059669' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.cardTabBtnText,
                        currentTab === 'safety' && styles.cardTabBtnTextActive,
                      ]}
                    >
                      Safety
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TAB 1: SCIENTIFIC PROOFS */}
                {currentTab === 'science' && (
                  <View style={styles.tabContentContainer}>
                    <View style={styles.subCardBox}>
                      <Text style={styles.subCardTitle}>Biochemical Action & Plant Physiology</Text>
                      <Text style={styles.subCardText}>
                        {item.scientificProof.biochemicalRole}
                      </Text>
                    </View>

                    {/* Cellular Mechanisms */}
                    <Text style={styles.subSectionHeader}>Physiological Mechanisms:</Text>
                    {item.scientificProof.keyMechanisms.map((mech, mIdx) => (
                      <View key={mIdx} style={styles.bulletRow}>
                        <CheckCircle2 size={15} color="#059669" style={{ marginTop: 2 }} />
                        <Text style={styles.bulletText}>{mech}</Text>
                      </View>
                    ))}

                    {/* Scientific Citations & Yield Boost */}
                    <Text style={styles.subSectionHeader}>Field Trial Evidence:</Text>
                    {item.scientificProof.citations.map((cite, cIdx) => (
                      <View key={cIdx} style={styles.citationBox}>
                        <View style={styles.citationTopRow}>
                          <Text style={styles.citationOrg}>{cite.institution} ({cite.year})</Text>
                          <View style={styles.yieldBoostPill}>
                            <TrendingUp size={12} color="#047857" />
                            <Text style={styles.yieldBoostText}>{cite.yieldBoost}</Text>
                          </View>
                        </View>
                        <Text style={styles.citationFinding}>{cite.finding}</Text>
                      </View>
                    ))}

                    {/* Deficiency Symptoms */}
                    <View style={styles.deficiencyBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <AlertTriangle size={15} color="#D97706" />
                        <Text style={styles.deficiencyTitle}>Deficiency Symptoms:</Text>
                      </View>
                      <Text style={styles.deficiencyText}>{item.scientificProof.deficiencySymptoms}</Text>
                    </View>
                  </View>
                )}

                {/* TAB 2: LAND DOSAGES */}
                {currentTab === 'dosage' && (
                  <View style={styles.tabContentContainer}>
                    <View style={styles.generalDosageBanner}>
                      <View style={styles.generalDosageItem}>
                        <Text style={styles.generalDosageLabel}>Standard Per Acre</Text>
                        <Text style={styles.generalDosageValue}>{item.dosages.generalPerAcre}</Text>
                      </View>
                      <View style={styles.generalDosageDivider} />
                      <View style={styles.generalDosageItem}>
                        <Text style={styles.generalDosageLabel}>Standard Per Hectare</Text>
                        <Text style={styles.generalDosageValue}>{item.dosages.generalPerHectare}</Text>
                      </View>
                    </View>

                    <Text style={styles.subSectionHeader}>Crop-Specific Recommendations:</Text>
                    {item.dosages.cropSpecific.map((cd, dIdx) => (
                      <View key={dIdx} style={styles.cropDoseItem}>
                        <View style={styles.cropDoseHeader}>
                          <Text style={styles.cropDoseName}>{cd.cropName}</Text>
                          <Text style={styles.cropDoseValue}>
                            {cd.dosePerAcreKg} kg / Acre ({cd.dosePerHaKg} kg / Ha)
                          </Text>
                        </View>
                        <Text style={styles.cropDoseSchedule}>
                          <Text style={{ fontWeight: '700' }}>Schedule: </Text>
                          {cd.applicationStage}
                        </Text>
                        <Text style={styles.cropDoseTiming}>
                          <Text style={{ fontWeight: '700' }}>Timing: </Text>
                          {cd.splitSchedule}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* TAB 3: APPLICATION */}
                {currentTab === 'application' && (
                  <View style={styles.tabContentContainer}>
                    <Text style={styles.subSectionHeader}>Recommended Application Methods:</Text>
                    {item.applicationGuide.methods.map((method, mIdx) => (
                      <View key={mIdx} style={styles.bulletRow}>
                        <Sprout size={15} color="#059669" style={{ marginTop: 2 }} />
                        <Text style={styles.bulletText}>{method}</Text>
                      </View>
                    ))}

                    <View style={styles.infoHighlightBox}>
                      <Text style={styles.infoHighlightTitle}>Optimal Time of Day</Text>
                      <Text style={styles.infoHighlightText}>{item.applicationGuide.bestTiming}</Text>
                    </View>

                    <View style={styles.infoHighlightBox}>
                      <Text style={styles.infoHighlightTitle}>Required Soil Moisture</Text>
                      <Text style={styles.infoHighlightText}>{item.applicationGuide.soilCondition}</Text>
                    </View>
                  </View>
                )}

                {/* TAB 4: SAFETY & ENVIRONMENT */}
                {currentTab === 'safety' && (
                  <View style={styles.tabContentContainer}>
                    <View style={styles.safetyRow}>
                      <Text style={styles.safetyLabel}>Environmental Runoff Risk:</Text>
                      <View
                        style={[
                          styles.riskBadge,
                          item.safetyAndEnvironment.runoffRisk === 'Low'
                            ? { backgroundColor: '#DCFCE7' }
                            : { backgroundColor: '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.riskBadgeText,
                            item.safetyAndEnvironment.runoffRisk === 'Low'
                              ? { color: '#166534' }
                              : { color: '#B45309' },
                          ]}
                        >
                          {item.safetyAndEnvironment.runoffRisk} Risk
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.subSectionHeader}>Handling & Soil Precautions:</Text>
                    {item.safetyAndEnvironment.precautions.map((prec, pIdx) => (
                      <View key={pIdx} style={styles.bulletRow}>
                        <ShieldCheck size={15} color="#2563EB" style={{ marginTop: 2 }} />
                        <Text style={styles.bulletText}>{prec}</Text>
                      </View>
                    ))}

                    <View style={styles.storageBox}>
                      <Text style={styles.storageTitle}>Proper Storage Guideline</Text>
                      <Text style={styles.storageText}>{item.safetyAndEnvironment.storageGuidelines}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* SCIENTIFIC STUDIES & FIELD BENCHMARKS */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <BookOpen size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Agronomic Research Highlights</Text>
          </View>
        </View>

        <View style={styles.researchHighlightsContainer}>
          {SCIENTIFIC_RESEARCH_HIGHLIGHTS.map((study) => (
            <View key={study.id} style={styles.researchCard}>
              <View style={styles.researchTopRow}>
                <View style={[styles.proofBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.proofBadgeText, { color: study.color }]}>
                    {study.proofBadge}
                  </Text>
                </View>
                <Text style={styles.researchYear}>{study.year}</Text>
              </View>

              <Text style={styles.researchTitle}>{study.title}</Text>
              <Text style={styles.researchOrg}>{study.institution}</Text>
              <View style={styles.researchMetricRow}>
                <TrendingUp size={16} color="#059669" />
                <Text style={styles.researchMetricText}>{study.metric}</Text>
              </View>
              <Text style={styles.researchSummary}>{study.summary}</Text>
            </View>
          ))}
        </View>

        {/* MASTER CROP DOSAGE REFERENCE TABLE */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <Layers size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Master Crop Dosage Comparison Matrix</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.tableScroll}
        >
          <View style={styles.matrixTable}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: 130 }]}>Crop</Text>
              <Text style={[styles.tableHeaderCell, { width: 110 }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { width: 120 }]}>NPK Ratio</Text>
              <Text style={[styles.tableHeaderCell, { width: 110 }]}>Urea (kg/Acre)</Text>
              <Text style={[styles.tableHeaderCell, { width: 110 }]}>DAP (kg/Acre)</Text>
              <Text style={[styles.tableHeaderCell, { width: 110 }]}>MOP (kg/Acre)</Text>
              <Text style={[styles.tableHeaderCell, { width: 120 }]}>Compost (kg/Acre)</Text>
            </View>

            {/* Table Rows */}
            {COMMON_CROPS_DATABASE.map((c, idx) => (
              <View
                key={c.cropId}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
                ]}
              >
                <View style={[styles.tableCellBox, { width: 130, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <Text>{c.icon}</Text>
                  <Text style={styles.tableCellBold}>{getLocalizedCropName(c)}</Text>
                </View>
                <Text style={[styles.tableCell, { width: 110 }]}>{c.category}</Text>
                <Text style={[styles.tableCellBadge, { width: 120 }]}>{c.npkRatio}</Text>
                <Text style={[styles.tableCell, { width: 110, fontWeight: '700', color: '#166534' }]}>
                  {c.defaultFertilizersPerAcre.ureaKg} kg
                </Text>
                <Text style={[styles.tableCell, { width: 110, fontWeight: '700', color: '#1D4ED8' }]}>
                  {c.defaultFertilizersPerAcre.dapKg} kg
                </Text>
                <Text style={[styles.tableCell, { width: 110, fontWeight: '700', color: '#B45309' }]}>
                  {c.defaultFertilizersPerAcre.mopKg} kg
                </Text>
                <Text style={[styles.tableCell, { width: 120 }]}>
                  {c.defaultFertilizersPerAcre.vermicompostKg} kg
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* LANGUAGE SELECTOR MODAL */}
      <Modal
        visible={isLangModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Globe size={20} color="#059669" />
                <Text style={styles.modalTitle}>Choose Language / மொழி</Text>
              </View>
              <TouchableOpacity onPress={() => setIsLangModalOpen(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              All fertilizer names, scientific proofs, dosages, and voice audio will adapt to your chosen language.
            </Text>

            <ScrollView style={{ maxHeight: 360 }}>
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = selectedLang.code === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langModalItem,
                      isSelected && styles.langModalItemActive,
                    ]}
                    onPress={() => handleSelectLanguage(lang)}
                  >
                    <View>
                      <Text
                        style={[
                          styles.langModalItemNative,
                          isSelected && styles.langModalItemNativeActive,
                        ]}
                      >
                        {lang.native}
                      </Text>
                      <Text style={styles.langModalItemLabel}>{lang.label}</Text>
                    </View>
                    {isSelected && <Check size={18} color="#059669" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Interactive AI Fertilizer Bubble Chat */}
      <FertilizerAIBubbleChat />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1.2,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064E3B',
  },
  langSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  langSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  floatingAudioBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  audioBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  audioWavePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
  },
  audioBarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  audioBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioSpeedBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  audioSpeedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  audioStopBtn: {
    padding: 6,
    backgroundColor: '#DC2626',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
  },
  heroSection: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroPillText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#D1FAE5',
    lineHeight: 19,
    marginBottom: 16,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
  },
  listenSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  listenSectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  calculatorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calculatorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cropChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cropChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  cropChipIcon: {
    fontSize: 15,
  },
  cropChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  cropChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  areaInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  areaInputBox: {
    flex: 1,
  },
  numericTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  unitSelectorBox: {
    flex: 1.5,
  },
  unitPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  unitPillActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
  },
  landEquivBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  landEquivText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
  },
  dosageResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  dosageCard: {
    width: IS_DESKTOP ? '23%' : '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
  },
  dosageCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dosageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dosageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dosageBagCount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  dosageUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  dosageFertName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  dosageKgText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  dosageTimingNote: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 13,
  },
  timelineContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineDotLine: {
    alignItems: 'center',
    marginRight: 10,
    width: 22,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineStageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timelineStageName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineTimeframe: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  timelineInstruction: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  categoryPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  encyclopediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImageContainer: {
    height: 190,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  npkPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  npkPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionBtn: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  cardAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#059669',
  },
  cardAudioBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardCategoryText: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTitleText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cardChemicalText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontStyle: 'italic',
  },
  cardBody: {
    padding: 16,
  },
  cardTagline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  cardTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  cardTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  cardTabBtnTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  tabContentContainer: {
    paddingTop: 4,
  },
  subCardBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  subCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subCardText: {
    fontSize: 13,
    color: '#14532D',
    lineHeight: 18,
  },
  subSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    flex: 1,
  },
  citationBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  citationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  citationOrg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    flex: 1,
  },
  yieldBoostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  yieldBoostText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  citationFinding: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  deficiencyBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
  },
  deficiencyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  deficiencyText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  generalDosageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  generalDosageItem: {
    alignItems: 'center',
    flex: 1,
  },
  generalDosageLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  generalDosageValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  generalDosageDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  cropDoseItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    marginBottom: 8,
  },
  cropDoseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cropDoseName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  cropDoseValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  cropDoseSchedule: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  cropDoseTiming: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  infoHighlightBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 8,
  },
  infoHighlightTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoHighlightText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  safetyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  storageBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  storageTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 2,
  },
  storageText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  researchHighlightsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  researchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  researchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  proofBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proofBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  researchYear: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  researchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  researchOrg: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  researchMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  researchMetricText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  researchSummary: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  tableScroll: {
    paddingBottom: 10,
  },
  matrixTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#065F46',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableCellBox: {
    paddingRight: 6,
  },
  tableCellBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  tableCell: {
    fontSize: 12,
    color: '#334155',
  },
  tableCellBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  langModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langModalItemActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  langModalItemNative: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  langModalItemNativeActive: {
    color: '#166534',
  },
  langModalItemLabel: {
    fontSize: 11,
    color: '#64748B',
  },
});
