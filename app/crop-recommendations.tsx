import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Bookmark, Share2, Eye, X, Bug, Sun, Droplets, AlertCircle
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

export default function AICropRecommendationScreen() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);

  const [aiCrops, setAiCrops] = useState<CropRecommendation[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | null>(null);

  // Fetch current weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorWeather(t('weather.locationPermission'));
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
          setErrorWeather(t('weather.error'));
        }
      } catch (e) {
        console.error(e);
        setErrorWeather(t('weather.error'));
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchWeather();
  }, [t]);

  // Fetch AI crop recommendations based on weather
  useEffect(() => {
    const fetchAICrops = async () => {
      if (!weather) return;
      setLoadingAI(true);
      try {
        const prompt = `
        You are an expert crop advisor. Suggest 3-5 crops suitable for the current weather:
        Temperature: ${weather.temperature}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} km/h, Visibility: ${weather.visibility} km.
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

        // Robust JSON parse
        try {
          const raw = data?.choices?.[0]?.message?.content || "[]";
          const match = raw.match(/\[.*\]/s);
          if (match) {
            const crops = JSON.parse(match[0]);
            // Ensure every crop has risks as array
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
    fetchAICrops();
  }, [weather]);

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('crops.title')}</Text>
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
              <Text style={styles.weatherTitle}>{t('weather.today')}</Text>
              <Text>Temp: {weather.temperature}°C | Humidity: {weather.humidity}% | Wind: {weather.windSpeed} km/h</Text>
            </View>
          ) : null}
        </View>

        {/* AI Crop Recommendations */}
        <View style={{ padding: 20 }}>
          {loadingAI ? (
            <ActivityIndicator size="large" color="#059669" />
          ) : aiCrops.length > 0 ? (
            aiCrops.map((crop: CropRecommendation, index: number) => (
              <View key={index} style={styles.cropCard}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{crop.name}</Text>
                {crop.projectedProfit !== undefined && <Text>Profit: ₹{crop.projectedProfit.toLocaleString()}</Text>}
                {crop.sustainabilityScore !== undefined && <Text>Sustainability: {crop.sustainabilityScore}/100</Text>}

                {/* Risks */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {crop.risks?.map((risk, idx) => {
                    const Icon = getRiskIcon(risk.type);
                    return (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon size={12} color={getRiskColor(risk.level)} />
                        <Text style={{ color: getRiskColor(risk.level), fontSize: 12 }}>{risk.level?.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                  <TouchableOpacity style={{ backgroundColor: '#34a853', padding: 8, borderRadius: 8 }}>
                    <Bookmark size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8 }}>
                    <Share2 size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8 }} onPress={() => setSelectedCrop(crop)}>
                    <Eye size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text>No AI recommendations available yet.</Text>
          )}
        </View>
      </ScrollView>

      {/* Modal for details */}
      <Modal visible={selectedCrop !== null} animationType="slide" transparent>
        {selectedCrop && (
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedCrop.name} Details</Text>
              <TouchableOpacity onPress={() => setSelectedCrop(null)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {selectedCrop.fertilizerPlan && selectedCrop.fertilizerPlan.length > 0 && (
                <>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Fertilizer Plan:</Text>
                  {selectedCrop.fertilizerPlan.map((item, idx) => <Text key={idx}>• {item}</Text>)}
                </>
              )}

              {selectedCrop.irrigationSchedule && (
                <>
                  <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>Irrigation Schedule:</Text>
                  <Text>{selectedCrop.irrigationSchedule}</Text>
                </>
              )}

              {selectedCrop.rationale && (
                <>
                  <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>Why Recommended:</Text>
                  <Text>{selectedCrop.rationale}</Text>
                </>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 16 },
  weatherCard: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12 },
  weatherTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cropCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3.8, elevation: 5 },
});
