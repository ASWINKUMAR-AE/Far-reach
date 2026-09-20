import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Leaf, Droplets, CheckCircle, Brain, BookOpen } from 'lucide-react-native';
import { fetchFertilizerRecommendation } from '@/lib/apiClient';
import { askHositAI } from '@/lib/hositAI';

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
  const [soil, setSoil] = useState({ N: initialN.toString(), P: initialP.toString(), K: initialK.toString(), pH: initialPH.toString() });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setAiExplanation('');
    
    try {
      const payload = {
        crop,
        area: parseFloat(area),
        area_unit: 'acre',
        soil: { N: parseFloat(soil.N), P: parseFloat(soil.P), K: parseFloat(soil.K), pH: parseFloat(soil.pH) }
      };
      
      const response = await fetchFertilizerRecommendation(payload);
      
      if (response && response.status === 'success') {
        setResult(response);
        
        // Pass deterministic data to AI for simple explanation formatting
        const aiPrompt = `
          The deterministic engine calculated the following for ${area} acres of ${crop}:
          Soil Status: N is ${response.calculation.soilStatus.n}, P is ${response.calculation.soilStatus.p}, K is ${response.calculation.soilStatus.k}.
          Target Required (kg): N=${response.calculation.required_npk_total.targetN_total}, P=${response.calculation.required_npk_total.targetP_total}, K=${response.calculation.required_npk_total.targetK_total}.
          
          Chemical Options provided by engine:
          ${JSON.stringify(response.recommendation.chemical_options)}
          
          Organic Options provided by engine:
          ${JSON.stringify(response.recommendation.organic_options)}

          Research Source Retrieved:
          ${response.sources[0]}

          FORMAT THIS AS A SIMPLE, FRIENDLY RECOMMENDATION FOR A FARMER.
          Use this exact structure:
          🌾 Crop & Soil Status
          🧪 Recommended Fertilizer
          🌱 Organic Alternative
          💡 Why this recommendation?
          📚 Source
          
          DO NOT INVENT DOSAGE. Only use the exact dosages provided above.
        `;

        const explanation = await askHositAI({ message: aiPrompt, userId: 'demo', context: 'You are an agricultural advisor formatting a deterministic response.' });
        setAiExplanation(explanation || "Unable to generate explanation.");
      } else {
        Alert.alert('Analysis Failed', 'Could not fetch fertilizer calculation.');
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#166534" />
        </TouchableOpacity>
        <Text style={styles.title}>AI Fertilizer Advisor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Crop Type</Text>
          <TextInput style={styles.input} value={crop} onChangeText={setCrop} placeholder="e.g. Rice, Wheat" />
          
          <Text style={styles.label}>Farm Area (Acres)</Text>
          <TextInput style={styles.input} value={area} onChangeText={setArea} keyboardType="numeric" />

          <Text style={styles.sectionTitle}>Soil Test Results</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Nitrogen (N)</Text>
              <TextInput style={styles.input} value={soil.N} onChangeText={t => setSoil({...soil, N: t})} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Phosphorus (P)</Text>
              <TextInput style={styles.input} value={soil.P} onChangeText={t => setSoil({...soil, P: t})} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Potassium (K)</Text>
              <TextInput style={styles.input} value={soil.K} onChangeText={t => setSoil({...soil, K: t})} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>pH Level</Text>
              <TextInput style={styles.input} value={soil.pH} onChangeText={t => setSoil({...soil, pH: t})} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleAnalyze} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Blueprint</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <CheckCircle size={20} color="#059669" />
              <Text style={styles.resultTitle}>Deterministic Calculation Complete</Text>
            </View>
            
            <View style={styles.rawBox}>
              <Text style={styles.rawText}>Target N: {result.calculation.required_npk_total.targetN_total.toFixed(1)} kg</Text>
              <Text style={styles.rawText}>Target P: {result.calculation.required_npk_total.targetP_total.toFixed(1)} kg</Text>
              <Text style={styles.rawText}>Target K: {result.calculation.required_npk_total.targetK_total.toFixed(1)} kg</Text>
            </View>

            <View style={styles.aiBox}>
              <View style={{flexDirection:'row', alignItems:'center', gap:6, marginBottom:8}}>
                <Brain size={18} color="#2563EB" />
                <Text style={styles.aiTitle}>AI Agronomist Explanation</Text>
              </View>
              {aiExplanation ? <Text style={styles.aiText}>{aiExplanation}</Text> : <ActivityIndicator color="#2563EB" />}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#DCFCE7' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#166534', marginLeft: 16 },
  scroll: { padding: 16 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, elevation: 2, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  button: { backgroundColor: '#16A34A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resultCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#A7F3D0' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  rawBox: { backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, marginBottom: 16 },
  rawText: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  aiBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8 },
  aiTitle: { fontSize: 14, fontWeight: 'bold', color: '#1D4ED8' },
  aiText: { fontSize: 14, color: '#334155', lineHeight: 22 }
});
