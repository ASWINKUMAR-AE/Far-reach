import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Bookmark, Share2, Eye, X, Bug, Sun, Droplets, AlertCircle, RotateCcw, Mic, CheckSquare, Square
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { translateText } from '@/lib/translationService';
import { DEFAULT_FARMER } from '@/lib/procurementService';
import { askHositAI } from '@/lib/hositAI';

interface CropRecommendation {
  id: string;
  name: string;
  nameHindi?: string;
  estimatedYield?: number;
  projectedProfit?: number;
  sustainabilityScore?: number;
  sowingWindow?: { start: string; end: string; };
  risks?: Array<{ type: 'pest' | 'drought' | 'flood' | 'disease'; level: 'low' | 'medium' | 'high'; description?: string; }>;
  fertilizerPlan?: string[];
  irrigationSchedule?: string;
  rationale?: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
}

const SOIL_TYPES = ['Loam', 'Sandy', 'Clay', 'Silt', 'Peaty'];
const SEASONS = ['Kharif', 'Rabi', 'Zaid'];

const LANGUAGES = [
  { code: 'en', name: 'English (India)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
];

const CHEMICAL_FERTILIZERS = ['Urea', 'DAP', 'NPK', 'MOP', 'Super Phosphate'];
const ORGANIC_FERTILIZERS = ['Neem Cake', 'Vermicompost', 'Cow Dung Manure', 'Bone Meal', 'Green Manure'];

export default function AICropRecommendationScreen() {
  const { i18n } = useTranslation();
  const params = useLocalSearchParams();
  const derivedSoilType = params.soilType as string;

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);

  const [aiCrops, setAiCrops] = useState<CropRecommendation[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | null>(null);

  // Form State (Soil defaults to Farmer Profile)
  const [previousCrop, setPreviousCrop] = useState('');
  const [selectedFerts, setSelectedFerts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'Chemical' | 'Organic'>('Chemical');
  const [soilType, setSoilType] = useState(derivedSoilType || DEFAULT_FARMER.soilType || 'Loam');
  const [season, setSeason] = useState('Kharif');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Dynamic Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedChem, setTranslatedChem] = useState<string[]>(CHEMICAL_FERTILIZERS);
  const [translatedOrg, setTranslatedOrg] = useState<string[]>(ORGANIC_FERTILIZERS);
  const [labels, setLabels] = useState({
    title: 'AI Crop Recommendations',
    weatherToday: "Today's Weather",
    askVoice: 'Ask AI Agronomist (Voice)',
    contextTitle: 'Crop Rotation Context',
    prevCrop: 'Previous Crop Grown',
    prevCropPlaceholder: 'e.g. Wheat, Sugarcane',
    fertUsed: 'Fertilizers Used',
    soilTypeLabel: 'Soil Type',
    seasonLabel: 'Upcoming Season',
    getAi: 'Get AI Recommendations',
    editInputs: 'Edit Inputs',
    analyzing: 'Analyzing data...',
    chemTab: 'Chemical',
    orgTab: 'Organic',
    profit: 'Profit: ₹',
    sust: 'Sustainability',
    fertPlan: 'Fertilizer Plan:',
    irrSch: 'Irrigation Schedule:',
    whyRec: 'Why Recommended:'
  });

  const changeLanguage = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    if (langCode === 'en') {
      setTranslatedChem(CHEMICAL_FERTILIZERS);
      setTranslatedOrg(ORGANIC_FERTILIZERS);
      setLabels({
        title: 'AI Crop Recommendations', weatherToday: "Today's Weather", askVoice: 'Ask AI Agronomist (Voice)',
        contextTitle: 'Crop Rotation Context', prevCrop: 'Previous Crop Grown', prevCropPlaceholder: 'e.g. Wheat, Sugarcane',
        fertUsed: 'Fertilizers Used', soilTypeLabel: 'Soil Type', seasonLabel: 'Upcoming Season',
        getAi: 'Get AI Recommendations', editInputs: 'Edit Inputs', analyzing: 'Analyzing data...',
        chemTab: 'Chemical', orgTab: 'Organic', profit: 'Profit: ₹', sust: 'Sustainability', fertPlan: 'Fertilizer Plan:',
        irrSch: 'Irrigation Schedule:', whyRec: 'Why Recommended:'
      });
      return;
    }
    
    setIsTranslating(true);
    try {
      const tc = await Promise.all(CHEMICAL_FERTILIZERS.map(f => translateText(f, "en", langCode)));
      const to = await Promise.all(ORGANIC_FERTILIZERS.map(f => translateText(f, "en", langCode)));
      setTranslatedChem(tc);
      setTranslatedOrg(to);

      const keys = Object.keys(labels) as Array<keyof typeof labels>;
      const newLabels = { ...labels };
      await Promise.all(keys.map(async (k) => {
        if (k !== 'profit') newLabels[k] = await translateText(labels[k], 'en', langCode);
      }));
      setLabels(newLabels);
    } catch (e) {
      console.warn("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorWeather('Location permission denied');
          setLoadingWeather(false);
          return;
        }
        let latitude = 10.7905;
        let longitude = 78.7047;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        } catch (locErr) {
          console.warn("Location fetch timeout, using fallback Tiruchirappalli coordinates.");
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,visibility,windspeed_10m`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.current_weather) {
          setWeather({
            temperature: Math.round(data.current_weather.temperature),
            windSpeed: Math.round(data.current_weather.windspeed),
            humidity: data.hourly?.relative_humidity_2m ? Math.round(data.hourly.relative_humidity_2m[0]) : 0,
            visibility: data.hourly?.visibility ? Math.round(data.hourly.visibility[0] / 1000) : 0,
          });
        } else {
          setErrorWeather('Weather data unavailable');
        }
      } catch (e) {
        console.error(e);
        setErrorWeather('Weather data unavailable');
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchWeather();
  }, []);

  const toggleFertilizer = (fert: string) => {
    const newFerts = new Set(selectedFerts);
    if (newFerts.has(fert)) newFerts.delete(fert);
    else newFerts.add(fert);
    setSelectedFerts(newFerts);
  };

  const fetchAICrops = async () => {
    if (!weather) return;
    setHasSubmitted(true);
    setLoadingAI(true);
    try {
      const fertsArray = Array.from(selectedFerts);
      const fertsStr = fertsArray.length > 0 ? fertsArray.join(', ') : 'None';
      
      const prompt = `
      You are an expert crop advisor. Suggest 3-5 crops suitable for the current season and soil:
      Weather: Temp: ${weather.temperature}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} km/h
      Previous Crop: ${previousCrop || 'None'}
      Fertilizers Used: ${fertsStr}
      Soil Type: ${soilType} (Auto-fetched from farmer profile or overridden)
      Season: ${season}

      CRITICAL SUCCESSION RULES:
      - If Previous Crop is Rice or Paddy: DO NOT suggest tree/shrub crops (like Mango, Banana). The field will be needed again in 6 months for the next Rice cycle. Suggest short-term pulses or legumes.
      - If Previous Crop is Sugarcane: Suggest deep-rooted restorative crops like Wheat or Legumes to replenish soil nutrients.
      - If Previous Crop is Cotton: DO NOT suggest closely related crops. Suggest non-host crops like Pulses to break the pest cycle (e.g., bollworm).

      Suggest the next crop based on crop rotation best practices, season, soil capacity, market value, and revenue.
      Include for each crop: name, estimatedYield(kg/acre), projectedProfit, sustainabilityScore(0-100), sowingWindow(start/end), risks(type and level), fertilizerPlan, irrigationSchedule, rationale.
      Output JSON array only.
      `;

      const aiEnglishReply = await askHositAI({ 
        message: prompt, 
        userId: DEFAULT_FARMER.id, 
        context: "You are an expert agronomist AI API. You must return only a valid JSON array as requested."
      });

      try {
        const raw = aiEnglishReply || "[]";
        const match = raw.match(/\[.*\]/s);
        if (match) {
          const crops = JSON.parse(match[0]);
          const safeCrops = crops.map((c: any) => ({
            ...c,
            risks: Array.isArray(c.risks) ? c.risks : [],
            fertilizerPlan: Array.isArray(c.fertilizerPlan) ? c.fertilizerPlan : [],
          }));
          setAiCrops(safeCrops);
        } else {
          setAiCrops([]);
        }
      } catch (err) {
        setAiCrops([]);
      }

    } catch (e) {
      console.error("AI fetch error:", e);
    } finally {
      setLoadingAI(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#16a34a';
      case 'medium': return '#ca8a04';
      case 'high': return '#dc2626';
      default: return '#6b776b';
    }
  };
  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'pest': return Bug;
      case 'drought': return Sun;
      case 'flood': return Droplets;
      default: return Bug;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{labels.title}</Text>
        </View>

        {/* Language Selector */}
        <View style={styles.langContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            {LANGUAGES.map((lang) => {
              const isActive = i18n.language === lang.code;
              return (
                <TouchableOpacity key={lang.code} onPress={() => changeLanguage(lang.code)} style={[styles.langButton, isActive && styles.langButtonActive]}>
                  <Text style={isActive ? styles.langTextActive : styles.langText}>{lang.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        
        {isTranslating && (
          <View style={{ padding: 8, backgroundColor: '#FEF3C7', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#D97706' }}>Translating UI...</Text>
          </View>
        )}

        {/* Weather Info */}
        <View style={{ padding: 20 }}>
          {loadingWeather ? (
            <ActivityIndicator size="large" color="#059669" />
          ) : errorWeather ? (
            <View style={{ alignItems: 'center' }}>
              <AlertCircle size={32} color="#ef4444" />
              <Text>{errorWeather}</Text>
            </View>
          ) : weather ? (
            <View style={styles.weatherCard}>
              <Text style={styles.weatherTitle}>{labels.weatherToday}</Text>
              <Text>Temp: {weather.temperature}°C | Humidity: {weather.humidity}% | Wind: {weather.windSpeed} km/h</Text>
            </View>
          ) : null}

          {/* Voice Assistant Button */}
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#166534', padding: 16, borderRadius: 12, flexDirection: 'row', 
              alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8,
              elevation: 3, shadowColor: '#166534', shadowOpacity: 0.3, shadowRadius: 5
            }}
            onPress={() => router.push('/(tabs)/Crop_rotation')}
          >
            <Mic size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              {labels.askVoice}
            </Text>
          </TouchableOpacity>
        </View>

        {!hasSubmitted ? (
          /* Form View */
          <View style={styles.formContainer}>
            <Text style={styles.formSectionTitle}>{labels.contextTitle}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{labels.prevCrop}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={labels.prevCropPlaceholder}
                value={previousCrop}
                onChangeText={setPreviousCrop}
              />
            </View>

            {/* Fertilizers Tabs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{labels.fertUsed}</Text>
              <View style={styles.fertContainer}>
                <View style={styles.fertTabs}>
                  <TouchableOpacity onPress={() => setActiveTab('Chemical')} style={[styles.fertTab, activeTab === 'Chemical' && styles.fertTabActive]}>
                    <Text style={[styles.fertTabText, activeTab === 'Chemical' && styles.fertTabTextActive]}>{labels.chemTab}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('Organic')} style={[styles.fertTab, activeTab === 'Organic' && styles.fertTabActive]}>
                    <Text style={[styles.fertTabText, activeTab === 'Organic' && styles.fertTabTextActive]}>{labels.orgTab}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.fertList}>
                  {(activeTab === 'Chemical' ? translatedChem : translatedOrg).map((f, index) => {
                    const originalName = activeTab === 'Chemical' ? CHEMICAL_FERTILIZERS[index] : ORGANIC_FERTILIZERS[index];
                    const isSelected = selectedFerts.has(originalName);
                    return (
                      <TouchableOpacity key={originalName} onPress={() => toggleFertilizer(originalName)} style={styles.fertRow}>
                        {isSelected ? <CheckSquare size={20} color="#166534" /> : <Square size={20} color="#94A3B8" />}
                        <Text style={[styles.fertLabel, isSelected && styles.fertLabelActive]}>{f}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{labels.soilTypeLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 8 }}>
                {SOIL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pill, soilType === type && styles.pillActive]}
                    onPress={() => setSoilType(type)}
                  >
                    <Text style={[styles.pillText, soilType === type && styles.pillTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{labels.seasonLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 8 }}>
                {SEASONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pill, season === s && styles.pillActive]}
                    onPress={() => setSeason(s)}
                  >
                    <Text style={[styles.pillText, season === s && styles.pillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={fetchAICrops} disabled={!weather || loadingWeather}>
              <Text style={styles.submitBtnText}>{labels.getAi}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Recommendations View */
          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity style={styles.startOverBtn} onPress={() => setHasSubmitted(false)}>
              <RotateCcw size={16} color="#059669" />
              <Text style={styles.startOverBtnText}>{labels.editInputs}</Text>
            </TouchableOpacity>

            {loadingAI ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={{ marginTop: 12, color: '#059669', fontWeight: 'bold' }}>{labels.analyzing}</Text>
              </View>
            ) : aiCrops.length > 0 ? (
              aiCrops.map((crop: CropRecommendation, index: number) => (
                <View key={index} style={styles.cropCard}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{crop.name}</Text>
                  {crop.projectedProfit !== undefined && <Text style={{ color: '#059669', fontWeight: 'bold', marginTop: 4 }}>{labels.profit}{crop.projectedProfit.toLocaleString()}</Text>}
                  {crop.sustainabilityScore !== undefined && <Text style={{ color: '#374151', marginTop: 2 }}>{labels.sust}: {crop.sustainabilityScore}/100</Text>}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {crop.risks?.map((risk, idx) => {
                      const Icon = getRiskIcon(risk.type);
                      return (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Icon size={12} color={getRiskColor(risk.level)} />
                          <Text style={{ color: getRiskColor(risk.level), fontSize: 12, fontWeight: '600' }}>{risk.level?.toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                    <TouchableOpacity style={{ backgroundColor: '#34a853', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' }}>
                      <Bookmark size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' }}>
                      <Share2 size={20} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' }} onPress={() => setSelectedCrop(crop)}>
                      <Eye size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#ef4444' }}>No AI recommendations available yet.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal for details */}
      <Modal visible={selectedCrop !== null} animationType="slide" transparent>
        {selectedCrop && (
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedCrop.name}</Text>
              <TouchableOpacity onPress={() => setSelectedCrop(null)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16, paddingBottom: 40 }}>
              {selectedCrop.fertilizerPlan && selectedCrop.fertilizerPlan.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>{labels.fertPlan}</Text>
                  {selectedCrop.fertilizerPlan.map((item, idx) => <Text key={idx} style={styles.detailText}>• {item}</Text>)}
                </View>
              )}

              {selectedCrop.irrigationSchedule && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>{labels.irrSch}</Text>
                  <Text style={styles.detailText}>{selectedCrop.irrigationSchedule}</Text>
                </View>
              )}

              {selectedCrop.rationale && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>{labels.whyRec}</Text>
                  <Text style={styles.detailText}>{selectedCrop.rationale}</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 16, color: '#0F172A' },
  weatherCard: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  weatherTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#166534' },
  
  langContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 4 },
  langButton: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#F1F5F9' },
  langButtonActive: { backgroundColor: '#166534' },
  langText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  langTextActive: { fontSize: 13, color: 'white', fontWeight: '700' },

  formContainer: { paddingHorizontal: 20, marginTop: 10 },
  formSectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#E5E7EB', borderRadius: 20, marginRight: 10 },
  pillActive: { backgroundColor: '#166534' },
  pillText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: 'white' },
  submitBtn: { backgroundColor: '#166534', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  fertContainer: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden' },
  fertTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  fertTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  fertTabActive: { borderBottomWidth: 2, borderBottomColor: '#166534' },
  fertTabText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  fertTabTextActive: { color: '#166534', fontWeight: '800' },
  fertList: { padding: 12 },
  fertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  fertLabel: { fontSize: 15, color: '#334155' },
  fertLabelActive: { color: '#166534', fontWeight: '700' },

  startOverBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 10, backgroundColor: '#DCFCE7', borderRadius: 8, marginBottom: 16, gap: 6 },
  startOverBtnText: { color: '#059669', fontWeight: 'bold' },
  
  cropCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6' },
  
  detailSection: { marginBottom: 20, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  detailTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#1F2937' },
  detailText: { fontSize: 15, color: '#4B5563', lineHeight: 22, marginBottom: 4 }
});
