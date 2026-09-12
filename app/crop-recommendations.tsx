import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Bookmark, Share2, Eye, X, Bug, Sun, Droplets, AlertCircle, RotateCcw
} from 'lucide-react-native';
import { router } from 'expo-router';

const DEEPSEEK_API_KEY = "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";
const DEEPSEEK_API_URL = "https://openrouter.ai/api/v1/chat/completions";

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

export default function AICropRecommendationScreen() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);

  const [aiCrops, setAiCrops] = useState<CropRecommendation[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | null>(null);

  // New Form State
  const [previousCrop, setPreviousCrop] = useState('');
  const [fertilizersUsed, setFertilizersUsed] = useState('');
  const [soilType, setSoilType] = useState('Loam');
  const [season, setSeason] = useState('Kharif');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Fetch current weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorWeather(t('weather.locationPermission') || 'Location permission denied');
          setLoadingWeather(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,visibility,windspeed_10m`;
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
          setErrorWeather(t('weather.error') || 'Weather data unavailable');
        }
      } catch (e) {
        console.error(e);
        setErrorWeather(t('weather.error') || 'Weather data unavailable');
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchWeather();
  }, [t]);

  const fetchAICrops = async () => {
    if (!weather) return;
    setHasSubmitted(true);
    setLoadingAI(true);
    try {
      const prompt = `
      You are an expert crop advisor. Suggest 3-5 crops suitable for the current season and soil:
      Weather: Temp: ${weather.temperature}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} km/h
      Previous Crop: ${previousCrop || 'None'}
      Fertilizers Used: ${fertilizersUsed || 'None'}
      Soil Type: ${soilType}
      Season: ${season}

      Suggest the next crop based on crop rotation best practices, season, soil capacity, market value, and revenue.
      Include for each crop: name, estimatedYield(kg/acre), projectedProfit, sustainabilityScore(0-100), sowingWindow(start/end), risks(type and level), fertilizerPlan, irrigationSchedule, rationale.
      Output JSON array only.
      `;
      const payload = {
        model: "deepseek/deepseek-chat-v3.1:free",
        messages: [
          { role: "system", content: "You are a helpful crop advisor." },
          { role: "user", content: prompt },
        ],
      };
      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      try {
        const raw = data?.choices?.[0]?.message?.content || "[]";
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
          console.warn("AI response does not contain valid JSON array:", raw);
          setAiCrops([]);
        }
      } catch (err) {
        console.error("Failed to parse AI response:", err, data?.choices?.[0]?.message?.content);
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
          <Text style={styles.headerTitle}>{t('crops.title') || 'AI Crop Recommendations'}</Text>
        </View>

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
              <Text style={styles.weatherTitle}>{t('weather.today') || 'Today\'s Weather'}</Text>
              <Text>Temp: {weather.temperature}°C | Humidity: {weather.humidity}% | Wind: {weather.windSpeed} km/h</Text>
            </View>
          ) : null}
        </View>

        {!hasSubmitted ? (
          /* Form View */
          <View style={styles.formContainer}>
            <Text style={styles.formSectionTitle}>Crop Rotation Context</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Previous Crop Grown</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Wheat, Sugarcane"
                value={previousCrop}
                onChangeText={setPreviousCrop}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fertilizers Used</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Urea, DAP"
                value={fertilizersUsed}
                onChangeText={setFertilizersUsed}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Soil Type</Text>
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
              <Text style={styles.inputLabel}>Upcoming Season</Text>
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
              <Text style={styles.submitBtnText}>Get AI Recommendations</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Recommendations View */
          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity 
              style={styles.startOverBtn} 
              onPress={() => setHasSubmitted(false)}
            >
              <RotateCcw size={16} color="#059669" />
              <Text style={styles.startOverBtnText}>Edit Inputs</Text>
            </TouchableOpacity>

            {loadingAI ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={{ marginTop: 12, color: '#059669', fontWeight: 'bold' }}>Analyzing data...</Text>
              </View>
            ) : aiCrops.length > 0 ? (
              aiCrops.map((crop: CropRecommendation, index: number) => (
                <View key={index} style={styles.cropCard}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{crop.name}</Text>
                  {crop.projectedProfit !== undefined && <Text style={{ color: '#059669', fontWeight: 'bold', marginTop: 4 }}>Profit: ₹{crop.projectedProfit.toLocaleString()}</Text>}
                  {crop.sustainabilityScore !== undefined && <Text style={{ color: '#374151', marginTop: 2 }}>Sustainability: {crop.sustainabilityScore}/100</Text>}

                  {/* Risks */}
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

                  {/* Action Buttons */}
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
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedCrop.name} Details</Text>
              <TouchableOpacity onPress={() => setSelectedCrop(null)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16, paddingBottom: 40 }}>
              {selectedCrop.fertilizerPlan && selectedCrop.fertilizerPlan.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Fertilizer Plan:</Text>
                  {selectedCrop.fertilizerPlan.map((item, idx) => <Text key={idx} style={styles.detailText}>• {item}</Text>)}
                </View>
              )}

              {selectedCrop.irrigationSchedule && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Irrigation Schedule:</Text>
                  <Text style={styles.detailText}>{selectedCrop.irrigationSchedule}</Text>
                </View>
              )}

              {selectedCrop.rationale && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Why Recommended:</Text>
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
  
  startOverBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 10, backgroundColor: '#DCFCE7', borderRadius: 8, marginBottom: 16, gap: 6 },
  startOverBtnText: { color: '#059669', fontWeight: 'bold' },
  
  cropCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6' },
  
  detailSection: { marginBottom: 20, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  detailTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#1F2937' },
  detailText: { fontSize: 15, color: '#4B5563', lineHeight: 22, marginBottom: 4 }
});
