import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Upload, Satellite, Camera, Info } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DEFAULT_FARMER } from '@/lib/procurementService';

const { width } = Dimensions.get('window');

type InputMethod = 'manual' | 'csv' | 'satellite' | 'camera';

interface SoilData {
  ph: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  organicMatter: string;
  moisture: string;
  temperature: string;
}

export default function SoilInputScreen() {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<InputMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [soilData, setSoilData] = useState<SoilData>({
    ph: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    organicMatter: '',
    moisture: '',
    temperature: '',
  });

  const inputMethods = [
    {
      id: 'manual' as InputMethod,
      titleKey: 'soil.methods.manual.title',
      descKey: 'soil.methods.manual.desc',
      icon: Info,
      color: '#3b82f6', // blue-500
    },
    {
      id: 'csv' as InputMethod,
      titleKey: 'soil.methods.csv.title',
      descKey: 'soil.methods.csv.desc',
      icon: Upload,
      color: '#34a853', // green-500
    },
    {
      id: 'satellite' as InputMethod,
      titleKey: 'soil.methods.satellite.title',
      descKey: 'soil.methods.satellite.desc',
      icon: Satellite,
      color: '#8b5cf6', // purple-500
    },
    {
      id: 'camera' as InputMethod,
      titleKey: 'soil.methods.camera.title',
      descKey: 'soil.methods.camera.desc',
      icon: Camera,
      color: '#f97316', // orange-500
    },
  ];

  const handleMethodSelect = (method: InputMethod) => {
    setSelectedMethod(method);
    
    if (method === 'satellite') {
      handleSatelliteAnalysis();
    } else if (method === 'camera') {
      handleCameraCapture();
    } else if (method === 'csv') {
      handleCSVUpload();
    }
  };

  const handleSatelliteAnalysis = async () => {
    setIsLoading(true);
    // Simulate satellite API call
    setTimeout(() => {
      setIsLoading(false);
      setSoilData({
        ph: '6.5',
        nitrogen: '45',
        phosphorus: '23',
        potassium: '178',
        organicMatter: '2.8',
        moisture: '28',
        temperature: '24',
      });
      DEFAULT_FARMER.soilType = 'Loam'; // logically persist the tested soil type for the AI session
      Alert.alert(t('soil.satellite.success'));
      setTimeout(() => {
        router.push({ pathname: '/crop-recommendations', params: { soilType: 'Loam' } });
      }, 500);
    }, 3000);
  };

  const handleCameraCapture = () => {
    // Navigate to camera screen or open camera
    Alert.alert(t('soil.camera.info'), t('soil.camera.instructions'));
    router.push('/(tabs)/CropScanner');
  };

  const handleCSVUpload = () => {
    // Simulate CSV upload
    Alert.alert(t('soil.csv.info'), t('soil.csv.instructions'));
  };

  const handleAnalyze = () => {
    setIsLoading(true);
    // Simulate analysis
    setTimeout(() => {
      setIsLoading(false);
      // Pass the raw deterministic numbers to the new Engine
      router.push({ 
        pathname: '/fertilizer-advisor', 
        params: { 
          n: soilData.nitrogen, 
          p: soilData.phosphorus, 
          k: soilData.potassium, 
          ph: soilData.ph 
        } 
      });
    }, 2000);
  };

  const isDataComplete = () => {
    return Object.values(soilData).every(value => value.trim() !== '');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('soil.title')}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {t('soil.subtitle')}
          </Text>

          {/* Method Selection */}
          {!selectedMethod && (
            <View>
              <Text style={styles.sectionTitle}>
                {t('soil.selectMethod')}
              </Text>
              
              <View style={styles.methodsContainer}>
                {inputMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      onPress={() => handleMethodSelect(method.id)}
                      style={styles.methodCard}
                    >
                      <View style={styles.methodContent}>
                        <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
                          <IconComponent size={24} color="white" />
                        </View>
                        
                        <View style={styles.methodText}>
                          <Text style={styles.methodTitle}>
                            {t(method.titleKey)}
                          </Text>
                          <Text style={styles.methodDescription}>
                            {t(method.descKey)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Manual Input Form */}
          {selectedMethod === 'manual' && (
            <View>
              <View style={styles.formHeader}>
                <Text style={styles.sectionTitle}>
                  {t('soil.manual.title')}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMethod(null)}>
                  <Text style={styles.changeButton}>{t('common.change')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formCard}>
                <View style={styles.formFields}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>
                      {t('soil.fields.ph')}
                    </Text>
                    <TextInput
                      value={soilData.ph}
                      onChangeText={(value) => setSoilData(prev => ({ ...prev, ph: value }))}
                      placeholder="6.0 - 8.0"
                      keyboardType="numeric"
                      style={styles.input}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.formField, styles.halfField]}>
                      <Text style={styles.fieldLabel}>
                        {t('soil.fields.nitrogen')} (kg/ha)
                      </Text>
                      <TextInput
                        value={soilData.nitrogen}
                        onChangeText={(value) => setSoilData(prev => ({ ...prev, nitrogen: value }))}
                        placeholder="0-100"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    
                    <View style={[styles.formField, styles.halfField]}>
                      <Text style={styles.fieldLabel}>
                        {t('soil.fields.phosphorus')} (kg/ha)
                      </Text>
                      <TextInput
                        value={soilData.phosphorus}
                        onChangeText={(value) => setSoilData(prev => ({ ...prev, phosphorus: value }))}
                        placeholder="0-50"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.formField, styles.halfField]}>
                      <Text style={styles.fieldLabel}>
                        {t('soil.fields.potassium')} (kg/ha)
                      </Text>
                      <TextInput
                        value={soilData.potassium}
                        onChangeText={(value) => setSoilData(prev => ({ ...prev, potassium: value }))}
                        placeholder="0-300"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    
                    <View style={[styles.formField, styles.halfField]}>
                      <Text style={styles.fieldLabel}>
                        {t('soil.fields.organicMatter')} (%)
                      </Text>
                      <TextInput
                        value={soilData.organicMatter}
                        onChangeText={(value) => setSoilData(prev => ({ ...prev, organicMatter: value }))}
                        placeholder="0-5"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.formField, styles.halfField]}>
                      <Text style={styles.fieldLabel}>
                        {t('soil.fields.moisture')} (%)
                      </Text>
                      <TextInput
                        value={soilData.moisture}
                        onChangeText={(value) => setSoilData(prev => ({ ...prev, moisture: value }))}
                        placeholder="0-50"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    
                    <View style={[styles.formField, styles.halfField]}>
                      <Text style={styles.fieldLabel}>
                        {t('soil.fields.temperature')} (°C)
                      </Text>
                      <TextInput
                        value={soilData.temperature}
                        onChangeText={(value) => setSoilData(prev => ({ ...prev, temperature: value }))}
                        placeholder="15-35"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <Text style={styles.loadingText}>
                {selectedMethod === 'satellite' 
                  ? t('soil.satellite.analyzing')
                  : t('common.processing')
                }
              </Text>
            </View>
          )}

          {/* Analyze Button */}
          {selectedMethod && !isLoading && isDataComplete() && (
            <TouchableOpacity
              onPress={handleAnalyze}
              style={styles.analyzeButton}
            >
              <Text style={styles.analyzeButtonText}>
                {t('soil.analyze')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // gray-50
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: '#2d3b2d', // earth-900
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    color: '#6b776b', // earth-600
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  sectionTitle: {
    color: '#2d3b2d', // earth-900
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodText: {
    flex: 1,
  },
  methodTitle: {
    color: '#2d3b2d', // earth-900
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    color: '#6b776b', // earth-600
    fontSize: 14,
    lineHeight: 20,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeButton: {
    color: '#34a853', // primary-600
    fontSize: 14,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formFields: {
    gap: 16,
  },
  formField: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#2d3b2d', // earth-700
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2d3b2d', // earth-900
    backgroundColor: '#f9fafb', // gray-50
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  loadingText: {
    color: '#6b776b', // earth-600
    fontSize: 16,
    textAlign: 'center',
  },
  analyzeButton: {
    backgroundColor: '#34a853', // primary-500
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});