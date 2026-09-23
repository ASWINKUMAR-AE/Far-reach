import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Leaf,
  FlaskConical,
  CheckCircle,
  Brain,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sprout,
  Check,
  Scale,
} from 'lucide-react-native';

import {
  computeFertilizerBlueprint,
  FarmingPreference,
  FertilizerRecommendationResult,
  SoilValues,
} from '@/lib/fertilizerAdvisorEngine';
import { fetchFertilizerRecommendation } from '@/lib/apiClient';
import { askHositAI } from '@/lib/hositAI';
import FertilizerAIBubbleChat from '@/components/fertilizer/FertilizerAIBubbleChat';

const COMMON_CROPS = [
  { id: 'Rice', name: 'Rice / Paddy', icon: '🌾' },
  { id: 'Wheat', name: 'Wheat', icon: '🍞' },
  { id: 'Maize', name: 'Maize (Corn)', icon: '🌽' },
  { id: 'Cotton', name: 'Cotton', icon: '☁️' },
  { id: 'Tomato', name: 'Tomato', icon: '🍅' },
  { id: 'Potato', name: 'Potato', icon: '🥔' },
  { id: 'Sugarcane', name: 'Sugarcane', icon: '🎋' },
  { id: 'Soybean', name: 'Soybean', icon: '🌱' },
];

export default function FertilizerAdvisorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Inherit params if coming from soil-input
  const initialN = params.n ? parseFloat(params.n as string) : 210;
  const initialP = params.p ? parseFloat(params.p as string) : 15;
  const initialK = params.k ? parseFloat(params.k as string) : 150;
  const initialPH = params.ph ? parseFloat(params.ph as string) : 6.5;

  const [crop, setCrop] = useState('Rice');
  const [area, setArea] = useState('2');
  const [preference, setPreference] = useState<FarmingPreference>('both');
  const [soil, setSoil] = useState({
    N: initialN.toString(),
    P: initialP.toString(),
    K: initialK.toString(),
    pH: initialPH.toString(),
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FertilizerRecommendationResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'organic' | 'chemical' | 'schedule'>('organic');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Auto-set the active result tab to match farmer's preference
  useEffect(() => {
    if (preference === 'organic') {
      setActiveResultTab('organic');
    } else if (preference === 'chemical') {
      setActiveResultTab('chemical');
    } else {
      setActiveResultTab('organic');
    }
  }, [preference]);

  // Clean up TTS
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {}
    };
  }, []);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const handleToggleSpeech = () => {
    triggerHaptic();
    if (isSpeaking) {
      try {
        Speech.stop();
      } catch {}
      setIsSpeaking(false);
      return;
    }

    if (!result) return;

    let textToSpeak = '';
    if (preference === 'organic') {
      textToSpeak = `Organic fertilizer recommendation for ${result.areaAcres} acres of ${result.crop}: Soil status: Nitrogen is ${result.soilStatus.n}, Phosphorus is ${result.soilStatus.p}, Potassium is ${result.soilStatus.k}. We prescribe: ${result.organicOptions[0]?.quantityFormatted} of ${result.organicOptions[0]?.fertilizerName}, plus ${result.organicOptions[1]?.quantityFormatted} of ${result.organicOptions[1]?.fertilizerName}, and ${result.organicOptions[2]?.quantityFormatted} of Bio-fertilizers. Basal application at sowing ensures optimal soil carbon and chemical-free yield.`;
    } else {
      textToSpeak = `Fertilizer calculation for ${result.areaAcres} acres of ${result.crop}: Target required: Nitrogen ${result.targetNutrientsKg.N} kg, Phosphorus ${result.targetNutrientsKg.P} kg, Potassium ${result.targetNutrientsKg.K} kg. Recommended chemical bags: ${result.chemicalOptions[0]?.bags50kg} bags of Neem Coated Urea, ${result.chemicalOptions[1]?.bags50kg} bags of DAP, and ${result.chemicalOptions[2]?.bags50kg} bags of MOP Potash. Organic alternative is also available with ${result.organicOptions[0]?.quantityFormatted} of Vermicompost.`;
    }

    setIsSpeaking(true);
    try {
      Speech.speak(textToSpeak, {
        language: 'en-IN',
        rate: 1.0,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleAnalyze = async () => {
    triggerHaptic();
    setLoading(true);
    setResult(null);
    try {
      Speech.stop();
    } catch {}
    setIsSpeaking(false);

    const parsedArea = parseFloat(area) || 2;
    const soilValues: SoilValues = {
      N: parseFloat(soil.N) || 210,
      P: parseFloat(soil.P) || 15,
      K: parseFloat(soil.K) || 150,
      pH: parseFloat(soil.pH) || 6.5,
    };

    // 1. Calculate deterministic recommendation locally (instant & 100% resilient)
    const localBlueprint = computeFertilizerBlueprint(crop, parsedArea, soilValues, preference);

    // 2. Attempt remote enrichment with strict 3.5s timeout (never hangs user)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const remotePromise = fetchFertilizerRecommendation({
        crop,
        area: parsedArea,
        area_unit: 'acre',
        soil: soilValues,
      });

      const response = await Promise.race([
        remotePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500)),
      ]).catch(() => null);

      clearTimeout(timer);

      // If remote returned custom explanation, incorporate it
      if (response && (response as any).status === 'success') {
        const remoteData = response as any;
        if (remoteData.recommendation?.chemical_options) {
          // Enrich with remote sources if available
          if (remoteData.sources?.[0]) {
            localBlueprint.sources = [remoteData.sources[0], ...localBlueprint.sources];
          }
        }
      }
    } catch {}

    setResult(localBlueprint);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color="#166534" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>AI Fertilizer Advisor</Text>
          <Text style={styles.headerSubtitle}>Deterministic Soil Analysis & Prescriptions</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner Link to Dedicated Fertilizer Info Hub */}
        <TouchableOpacity
          style={styles.hubBanner}
          onPress={() => router.push('/fertiliser-info' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.hubBannerLeft}>
            <View style={styles.hubBannerIcon}>
              <FlaskConical size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.hubBannerTitle}>FERTILISER INFO HUB</Text>
                <View style={styles.hubNewBadge}>
                  <Text style={styles.hubNewBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={styles.hubBannerSubtitle}>
                View high-res fertilizer photos, scientific proofs, and multi-lingual voice audio
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#166534" />
        </TouchableOpacity>

        {/* INPUT CARD */}
        <View style={styles.card}>
          {/* Crop Selector */}
          <Text style={styles.label}>Select Cultivated Crop</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cropChipsScroll}
          >
            {COMMON_CROPS.map((c) => {
              const isSelected = crop.toLowerCase() === c.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.cropChip, isSelected && styles.cropChipActive]}
                  onPress={() => {
                    triggerHaptic();
                    setCrop(c.id);
                  }}
                >
                  <Text style={styles.cropChipIcon}>{c.icon}</Text>
                  <Text style={[styles.cropChipText, isSelected && styles.cropChipTextActive]}>
                    {c.name}
                  </Text>
                  {isSelected && <Check size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Farm Area */}
          <Text style={styles.label}>Farm Area (Acres)</Text>
          <TextInput
            style={styles.input}
            value={area}
            onChangeText={setArea}
            keyboardType="numeric"
            placeholder="e.g. 2"
            placeholderTextColor="#94A3B8"
          />

          {/* FARMING PREFERENCE SELECTOR (ORGANIC VS CHEMICAL VS BOTH) */}
          <Text style={[styles.label, { marginTop: 14 }]}>
            Farming Preference (Organic vs Chemical)
          </Text>
          <View style={styles.preferenceRow}>
            <TouchableOpacity
              style={[
                styles.preferenceBtn,
                preference === 'organic' && styles.preferenceBtnOrganicActive,
              ]}
              onPress={() => {
                triggerHaptic();
                setPreference('organic');
              }}
            >
              <Sprout size={16} color={preference === 'organic' ? '#FFFFFF' : '#059669'} />
              <Text
                style={[
                  styles.preferenceBtnText,
                  preference === 'organic' && styles.preferenceBtnTextActive,
                ]}
              >
                100% Organic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.preferenceBtn,
                preference === 'chemical' && styles.preferenceBtnChemicalActive,
              ]}
              onPress={() => {
                triggerHaptic();
                setPreference('chemical');
              }}
            >
              <FlaskConical size={16} color={preference === 'chemical' ? '#FFFFFF' : '#2563EB'} />
              <Text
                style={[
                  styles.preferenceBtnText,
                  preference === 'chemical' && styles.preferenceBtnTextActive,
                ]}
              >
                Chemical
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.preferenceBtn,
                preference === 'both' && styles.preferenceBtnBothActive,
              ]}
              onPress={() => {
                triggerHaptic();
                setPreference('both');
              }}
            >
              <Scale size={16} color={preference === 'both' ? '#FFFFFF' : '#065F46'} />
              <Text
                style={[
                  styles.preferenceBtnText,
                  preference === 'both' && styles.preferenceBtnTextActive,
                ]}
              >
                Integrated (Both)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Soil Test Results Inputs */}
          <Text style={styles.sectionTitle}>Soil Test Inputs (from Lab or Sensor)</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Nitrogen (N) kg/ha</Text>
              <TextInput
                style={styles.input}
                value={soil.N}
                onChangeText={(t) => setSoil({ ...soil, N: t })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Phosphorus (P) kg/ha</Text>
              <TextInput
                style={styles.input}
                value={soil.P}
                onChangeText={(t) => setSoil({ ...soil, P: t })}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Potassium (K) kg/ha</Text>
              <TextInput
                style={styles.input}
                value={soil.K}
                onChangeText={(t) => setSoil({ ...soil, K: t })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>pH Level</Text>
              <TextInput
                style={styles.input}
                value={soil.pH}
                onChangeText={(t) => setSoil({ ...soil, pH: t })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleAnalyze}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Generate Fertilizer Blueprint</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* RESULTS SECTION */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <CheckCircle size={22} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>Agronomic Blueprint Generated</Text>
                <Text style={styles.resultSubtitle}>
                  Tailored for {result.areaAcres} Acres of {result.crop} • Preference:{' '}
                  {preference === 'organic'
                    ? '🌿 100% Organic'
                    : preference === 'chemical'
                    ? '🧪 Chemical'
                    : '⚖️ Integrated'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.ttsButton, isSpeaking && styles.ttsButtonSpeaking]}
                onPress={handleToggleSpeech}
                accessibilityLabel="Listen to blueprint"
              >
                {isSpeaking ? (
                  <VolumeX size={16} color="#FFFFFF" />
                ) : (
                  <Volume2 size={16} color="#059669" />
                )}
                <Text style={[styles.ttsButtonText, isSpeaking && { color: '#FFFFFF' }]}>
                  {isSpeaking ? 'Stop' : 'Listen'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Soil Status Analysis Box */}
            <View style={styles.soilAnalysisBox}>
              <Text style={styles.boxHeaderTitle}>Soil Health Status & Target Needs</Text>
              <View style={styles.soilStatusPillsRow}>
                <View style={styles.soilStatusPill}>
                  <Text style={styles.soilStatusPillLabel}>Nitrogen (N)</Text>
                  <Text
                    style={[
                      styles.soilStatusPillValue,
                      result.soilStatus.n === 'LOW'
                        ? { color: '#DC2626' }
                        : result.soilStatus.n === 'HIGH'
                        ? { color: '#166534' }
                        : { color: '#D97706' },
                    ]}
                  >
                    {result.soilStatus.n} ({soil.N})
                  </Text>
                </View>

                <View style={styles.soilStatusPill}>
                  <Text style={styles.soilStatusPillLabel}>Phosphorus (P)</Text>
                  <Text
                    style={[
                      styles.soilStatusPillValue,
                      result.soilStatus.p === 'LOW'
                        ? { color: '#DC2626' }
                        : result.soilStatus.p === 'HIGH'
                        ? { color: '#166534' }
                        : { color: '#D97706' },
                    ]}
                  >
                    {result.soilStatus.p} ({soil.P})
                  </Text>
                </View>

                <View style={styles.soilStatusPill}>
                  <Text style={styles.soilStatusPillLabel}>Potassium (K)</Text>
                  <Text
                    style={[
                      styles.soilStatusPillValue,
                      result.soilStatus.k === 'LOW'
                        ? { color: '#DC2626' }
                        : result.soilStatus.k === 'HIGH'
                        ? { color: '#166534' }
                        : { color: '#D97706' },
                    ]}
                  >
                    {result.soilStatus.k} ({soil.K})
                  </Text>
                </View>

                <View style={styles.soilStatusPill}>
                  <Text style={styles.soilStatusPillLabel}>Soil pH</Text>
                  <Text style={[styles.soilStatusPillValue, { color: '#0284C7' }]}>
                    {soil.pH} ({result.soilStatus.phStatus})
                  </Text>
                </View>
              </View>

              <Text style={styles.phDescText}>{result.soilStatus.phDescription}</Text>
              <Text style={styles.targetNutrientsText}>
                🎯 Net Field Target: N = {result.targetNutrientsKg.N} kg • P ={' '}
                {result.targetNutrientsKg.P} kg • K = {result.targetNutrientsKg.K} kg
              </Text>
            </View>

            {/* RESULTS SWITCH TABS */}
            <View style={styles.resultTabsRow}>
              <TouchableOpacity
                style={[
                  styles.resultTabBtn,
                  activeResultTab === 'organic' && styles.resultTabBtnOrganicActive,
                ]}
                onPress={() => {
                  triggerHaptic();
                  setActiveResultTab('organic');
                }}
              >
                <Sprout
                  size={15}
                  color={activeResultTab === 'organic' ? '#FFFFFF' : '#059669'}
                />
                <Text
                  style={[
                    styles.resultTabBtnText,
                    activeResultTab === 'organic' && styles.resultTabBtnTextActive,
                  ]}
                >
                  🌿 Organic Prescriptions ({result.organicOptions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resultTabBtn,
                  activeResultTab === 'chemical' && styles.resultTabBtnChemicalActive,
                ]}
                onPress={() => {
                  triggerHaptic();
                  setActiveResultTab('chemical');
                }}
              >
                <FlaskConical
                  size={15}
                  color={activeResultTab === 'chemical' ? '#FFFFFF' : '#2563EB'}
                />
                <Text
                  style={[
                    styles.resultTabBtnText,
                    activeResultTab === 'chemical' && styles.resultTabBtnTextActive,
                  ]}
                >
                  🧪 Chemical Options ({result.chemicalOptions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resultTabBtn,
                  activeResultTab === 'schedule' && styles.resultTabBtnScheduleActive,
                ]}
                onPress={() => {
                  triggerHaptic();
                  setActiveResultTab('schedule');
                }}
              >
                <Calendar
                  size={15}
                  color={activeResultTab === 'schedule' ? '#FFFFFF' : '#B45309'}
                />
                <Text
                  style={[
                    styles.resultTabBtnText,
                    activeResultTab === 'schedule' && styles.resultTabBtnTextActive,
                  ]}
                >
                  📅 Split Schedule
                </Text>
              </TouchableOpacity>
            </View>

            {/* VIEW 1: ORGANIC OPTIONS */}
            {activeResultTab === 'organic' && (
              <View style={styles.tabContentBox}>
                <View style={styles.organicHeaderNote}>
                  <Sprout size={16} color="#059669" />
                  <Text style={styles.organicHeaderNoteText}>
                    100% natural, bio-available organic nutrient management tailored for{' '}
                    {result.areaAcres} Acres.
                  </Text>
                </View>

                {result.organicOptions.map((org, idx) => (
                  <View key={idx} style={styles.prescriptionItem}>
                    <View style={styles.prescriptionTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prescriptionName}>{org.fertilizerName}</Text>
                        <Text style={styles.prescriptionPurpose}>{org.purpose}</Text>
                      </View>
                      <View style={styles.organicDoseBadge}>
                        <Text style={styles.organicDoseBadgeText}>{org.quantityFormatted}</Text>
                      </View>
                    </View>

                    <Text style={styles.prescriptionTiming}>
                      <Text style={{ fontWeight: '700', color: '#166534' }}>Application: </Text>
                      {org.timing}
                    </Text>

                    <Text style={styles.prescriptionMechanism}>
                      <Text style={{ fontWeight: '600' }}>Biochemical Effect: </Text>
                      {org.actionMechanism}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* VIEW 2: CHEMICAL OPTIONS */}
            {activeResultTab === 'chemical' && (
              <View style={styles.tabContentBox}>
                <View style={styles.chemicalHeaderNote}>
                  <FlaskConical size={16} color="#2563EB" />
                  <Text style={styles.chemicalHeaderNoteText}>
                    Deterministic chemical fertilizers computed from crop NPK stoichiometry for{' '}
                    {result.areaAcres} Acres.
                  </Text>
                </View>

                <View style={styles.chemicalGrid}>
                  {result.chemicalOptions.map((chem, idx) => (
                    <View key={idx} style={styles.chemicalCard}>
                      <View style={styles.chemicalCardHeader}>
                        <Text style={styles.chemicalCardName}>{chem.fertilizerName}</Text>
                        <View style={styles.bagsBadge}>
                          <Text style={styles.bagsBadgeText}>{chem.bags50kg} Bags</Text>
                        </View>
                      </View>
                      <Text style={styles.chemicalCardWeight}>{chem.quantityKg} kg Total</Text>
                      <Text style={styles.chemicalCardPurpose}>{chem.purpose}</Text>
                      <Text style={styles.chemicalCardTiming}>
                        <Text style={{ fontWeight: '700' }}>Timing: </Text>
                        {chem.timing}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* VIEW 3: SPLIT SCHEDULE */}
            {activeResultTab === 'schedule' && (
              <View style={styles.tabContentBox}>
                {result.splitSchedule.map((stage, sIdx) => (
                  <View key={sIdx} style={styles.scheduleItem}>
                    <View style={styles.scheduleHeaderRow}>
                      <View style={styles.scheduleBadge}>
                        <Text style={styles.scheduleBadgeText}>STAGE {sIdx + 1}</Text>
                      </View>
                      <Text style={styles.scheduleStageName}>{stage.stage}</Text>
                    </View>
                    <Text style={styles.scheduleTimeframe}>{stage.timeframe}</Text>

                    {preference === 'organic' || preference === 'both' ? (
                      <View style={styles.scheduleDoseBoxOrganic}>
                        <Text style={styles.scheduleDoseLabelOrganic}>🌿 Organic Application:</Text>
                        <Text style={styles.scheduleDoseText}>{stage.organicRecommendation}</Text>
                      </View>
                    ) : null}

                    {preference === 'chemical' || preference === 'both' ? (
                      <View style={styles.scheduleDoseBoxChemical}>
                        <Text style={styles.scheduleDoseLabelChemical}>🧪 Chemical Dose:</Text>
                        <Text style={styles.scheduleDoseText}>{stage.chemicalRecommendation}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* AI AGRONOMIST EXPLANATION BOX */}
            <View style={styles.aiBox}>
              <View style={styles.aiHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Brain size={18} color="#2563EB" />
                  <Text style={styles.aiTitle}>AI Agronomist Explanation</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={13} color="#047857" />
                  <Text style={styles.verifiedBadgeText}>Verified Formula</Text>
                </View>
              </View>

              <Text style={styles.aiText}>{result.aiExplanation}</Text>

              {/* Research References */}
              <View style={styles.sourcesBox}>
                <Text style={styles.sourcesTitle}>Research Citations:</Text>
                {result.sources.map((src, idx) => (
                  <Text key={idx} style={styles.sourceItemText}>
                    • {src}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating Interactive AI Fertilizer Bubble Chat */}
      <FertilizerAIBubbleChat />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#DCFCE7',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
  },
  hubBanner: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  hubBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hubBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  hubNewBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  hubNewBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  hubBannerSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
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
    paddingBottom: 10,
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
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  preferenceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  preferenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  preferenceBtnOrganicActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  preferenceBtnChemicalActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  preferenceBtnBothActive: {
    backgroundColor: '#065F46',
    borderColor: '#047857',
  },
  preferenceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  preferenceBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  button: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
  },
  resultSubtitle: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  ttsButtonSpeaking: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  ttsButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  soilAnalysisBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  boxHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  soilStatusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  soilStatusPill: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  soilStatusPillLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  soilStatusPillValue: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  phDescText: {
    fontSize: 11,
    color: '#0369A1',
    marginBottom: 6,
  },
  targetNutrientsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  resultTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  resultTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resultTabBtnOrganicActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  resultTabBtnChemicalActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  resultTabBtnScheduleActive: {
    backgroundColor: '#B45309',
    borderColor: '#92400E',
  },
  resultTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  resultTabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabContentBox: {
    marginBottom: 14,
  },
  organicHeaderNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  organicHeaderNoteText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  chemicalHeaderNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  chemicalHeaderNoteText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
    flex: 1,
  },
  prescriptionItem: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 8,
  },
  prescriptionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  prescriptionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14532D',
  },
  prescriptionPurpose: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  organicDoseBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  organicDoseBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  prescriptionTiming: {
    fontSize: 11,
    color: '#1E293B',
    marginTop: 4,
  },
  prescriptionMechanism: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
    fontStyle: 'italic',
  },
  chemicalGrid: {
    gap: 8,
  },
  chemicalCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chemicalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chemicalCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  bagsBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bagsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  chemicalCardWeight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  chemicalCardPurpose: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 2,
  },
  chemicalCardTiming: {
    fontSize: 11,
    color: '#334155',
  },
  scheduleItem: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  scheduleBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scheduleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scheduleStageName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350F',
  },
  scheduleTimeframe: {
    fontSize: 11,
    color: '#B45309',
    marginBottom: 6,
  },
  scheduleDoseBoxOrganic: {
    backgroundColor: '#F0FDF4',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  scheduleDoseLabelOrganic: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  scheduleDoseBoxChemical: {
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 6,
  },
  scheduleDoseLabelChemical: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  scheduleDoseText: {
    fontSize: 11,
    color: '#1E293B',
    marginTop: 2,
  },
  aiBox: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  aiText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  sourcesBox: {
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    paddingTop: 8,
  },
  sourcesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  sourceItemText: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
});
