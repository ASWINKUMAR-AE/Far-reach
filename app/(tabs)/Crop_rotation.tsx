import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { askHositAI } from '@/lib/hositAI';
import { DEFAULT_FARMER } from '@/lib/procurementService';

type RecommendationResponse = {
  nextCrop: string;
  expectedProfit?: number;
  rationale?: string;
  sowingWindow?: string;
  sustainabilityScore?: number;
  isAI?: boolean;
};

// Fallback Crop Rotation Map
const CROP_ROTATION_MAP: { [key: string]: { nextCrop: string; expectedProfit: number; rationale: string } } = {
  "Wheat": { nextCrop: "Pulses (Chickpea / Green Gram)", expectedProfit: 13500, rationale: "Fixes nitrogen into soil after heavy wheat extraction." },
  "Rice": { nextCrop: "Chickpea / Mustard", expectedProfit: 14200, rationale: "Breaks damp pest cycles and restores soil aeration." },
  "Paddy": { nextCrop: "Black Gram / Groundnut", expectedProfit: 15000, rationale: "Prevents soil salinity and enriches organic nitrogen." },
  "Maize": { nextCrop: "Soybean", expectedProfit: 12800, rationale: "Soybean replenishes nitrogen depleted during maize growth." },
  "Barley": { nextCrop: "Mustard", expectedProfit: 11500, rationale: "Optimizes rabi season moisture usage." },
  "Millets": { nextCrop: "Groundnut", expectedProfit: 10800, rationale: "Enhances soil microbial health in drylands." },
  "Cotton": { nextCrop: "Pulses", expectedProfit: 16500, rationale: "Breaks bollworm pest cycle." },
  "Sugarcane": { nextCrop: "Wheat", expectedProfit: 22000, rationale: "Utilizes deep root soil nutrients." },
  "Tomato": { nextCrop: "Cabbage", expectedProfit: 13800, rationale: "Prevents bacterial wilt accumulation." },
  "Potato": { nextCrop: "Maize", expectedProfit: 14500, rationale: "Improves soil structure and prevents tuber blight." },
};

const normalizeCropInput = (input: string) => {
  return input
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function NextCropRecommendationScreen() {
  const [currentCrop, setCurrentCrop] = useState<string>('Paddy (A-Grade)');
  const [soilType, setSoilType] = useState<string>('Alluvial Clay Loam');
  const [weatherInfo, setWeatherInfo] = useState<string>('Temp: 31°C, Humidity: 68%, Seasonal Monsoon');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Get current location weather context
  useEffect(() => {
    async function loadWeather() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true`
          );
          const data = await res.json();
          if (data?.current_weather) {
            setWeatherInfo(
              `Temp: ${Math.round(data.current_weather.temperature)}°C, Wind: ${Math.round(data.current_weather.windspeed)} km/h`
            );
          }
        }
      } catch (e) {
        console.log('[CropRotation] Weather fetch skipped, using default weather context.');
      }
    }
    loadWeather();
  }, []);

  const fetchAIRecommendation = async (crop: string): Promise<RecommendationResponse> => {
    const key = normalizeCropInput(crop);
    
    // AI Prompt incorporating weather, soil, and district features
    const prompt = `Act as an expert agronomist AI for Far Reach Farmer Procurement System.
Current Farmer Details:
- District: ${DEFAULT_FARMER.district}, Tamil Nadu
- Current Harvested Crop: ${crop}
- Soil Type: ${soilType}
- Live Weather: ${weatherInfo}

Recommend the BEST NEXT CROP for crop rotation.
Return output strictly in JSON format like:
{
  "nextCrop": "Name of recommended crop",
  "expectedProfit": 15000,
  "rationale": "Short explanation on soil health & pest cycle break",
  "sowingWindow": "Oct - Nov",
  "sustainabilityScore": 92
}`;

    try {
      const aiReply = await askHositAI({
        message: prompt,
        userId: DEFAULT_FARMER.id,
        context: 'Far Reach Crop Rotation Engine',
      });

      // Try parsing JSON response
      const match = aiReply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          nextCrop: parsed.nextCrop || 'Black Gram (Ulundu)',
          expectedProfit: parsed.expectedProfit || 14500,
          rationale: parsed.rationale || aiReply.slice(0, 150),
          sowingWindow: parsed.sowingWindow || 'Oct - Nov 2026',
          sustainabilityScore: parsed.sustainabilityScore || 90,
          isAI: true,
        };
      } else {
        // AI replied in natural text
        return {
          nextCrop: 'Pulses / Legumes',
          expectedProfit: 14000,
          rationale: aiReply,
          sowingWindow: 'Immediate Post-Harvest',
          sustainabilityScore: 88,
          isAI: true,
        };
      }
    } catch (err) {
      console.warn('[CropRotation] AI API offline, using smart static fallback.');
    }

    // Local fallback
    const fallback = CROP_ROTATION_MAP[key] || {
      nextCrop: 'Pulses (Black Gram / Chickpea)',
      expectedProfit: 13500,
      rationale: 'Fixes atmospheric nitrogen into soil and reduces chemical fertilizer requirement for next season.',
    };

    return {
      nextCrop: fallback.nextCrop,
      expectedProfit: fallback.expectedProfit,
      rationale: fallback.rationale,
      sowingWindow: 'Oct - Nov 2026',
      sustainabilityScore: 85,
      isAI: false,
    };
  };

  const onSubmit = async () => {
    if (!currentCrop.trim()) {
      Alert.alert('Validation Error', 'Please enter your current crop');
      return;
    }
    setLoading(true);
    setRecommendation(null);
    try {
      const result = await fetchAIRecommendation(currentCrop);
      setRecommendation(result);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not fetch recommendation. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Feather name={"sprout" as any} size={36} color="#166534" />
          <Text style={styles.heading}>Next Crop AI Planner</Text>
        </View>

        {/* Live Weather & Soil Feature Bar */}
        <View style={styles.featureBar}>
          <View style={styles.featureItem}>
            <Feather name="sun" size={14} color="#D97706" />
            <Text style={styles.featureText}>{weatherInfo}</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="layers" size={14} color="#166534" />
            <Text style={styles.featureText}>{soilType}</Text>
          </View>
        </View>

        {/* Inputs */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Current Harvested Crop</Text>
          <View style={styles.inputWrapper}>
            <Feather name="search" size={20} color="#166534" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter current crop (e.g., Paddy, Wheat)"
              placeholderTextColor="#A0A0A0"
              value={currentCrop}
              onChangeText={setCurrentCrop}
            />
          </View>
        </View>

        <TouchableOpacity onPress={onSubmit} style={styles.button}>
          <LinearGradient
            colors={['#166534', '#052E16']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Generate AI Crop Plan</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#166534" />
            <Text style={styles.loadingText}>Analyzing soil, weather & Hosit AI model...</Text>
          </View>
        )}

        {recommendation && !loading && (
          <View style={styles.resultContainer}>
            <LinearGradient
              colors={['#DCFCE7', '#F0FDF4']}
              style={styles.resultGradient}
            >
              <View style={styles.resultHeader}>
                <Feather name="check-circle" size={28} color="#166534" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.resultTitle}>AI Recommended Next Crop</Text>
                  <Text style={styles.aiBadgeText}>
                    {recommendation.isAI ? '🤖 Powered by Hosit AI' : '📋 Agronomist Fallback Engine'}
                  </Text>
                </View>
              </View>

              <View style={styles.resultContent}>
                <Text style={styles.resultLabel}>OPTIMAL NEXT CROP</Text>
                <Text style={styles.nextCrop}>{recommendation.nextCrop}</Text>

                {recommendation.expectedProfit != null && (
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>ESTIMATED PROFIT PER ACRE</Text>
                    <Text style={styles.profitText}>₹{recommendation.expectedProfit.toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {recommendation.sowingWindow && (
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>RECOMMENDED SOWING WINDOW</Text>
                    <Text style={styles.metaValue}>{recommendation.sowingWindow}</Text>
                  </View>
                )}

                {recommendation.rationale && (
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>SOIL & PEST ROTATION RATIONALE</Text>
                    <Text style={styles.rationaleText}>{recommendation.rationale}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#166534',
    marginLeft: 12,
  },
  featureBar: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    backgroundColor: 'white',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#166534',
    marginTop: 12,
    fontWeight: '600',
  },
  resultContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  resultGradient: {
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  resultContent: {
    paddingHorizontal: 4,
  },
  resultLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nextCrop: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },
  metaBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  profitText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#166534',
  },
  rationaleText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
});
