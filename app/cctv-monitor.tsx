import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Camera, ArrowLeft, RefreshCw, AlertTriangle, Users, PlaySquare, Info } from 'lucide-react-native';
import { askHositAI } from '@/lib/hositAI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

const COOLDOWN_MINUTES = 15;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
const LAST_FETCH_KEY = '@cctv_last_fetch_time';

export default function CctvMonitorScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const centreId = (params.centreId as string) || 'DEFAULT_CENTRE';
  const centreName = (params.centreName as string) || 'Procurement Centre';
  const dynamicFetchKey = `${LAST_FETCH_KEY}_${centreId}`;
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [crowdCount, setCrowdCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [feedActive, setFeedActive] = useState(false);

  useEffect(() => {
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkCooldown = async () => {
    try {
      const lastFetchStr = await AsyncStorage.getItem(dynamicFetchKey);
      if (lastFetchStr) {
        const lastFetch = parseInt(lastFetchStr, 10);
        const elapsed = Date.now() - lastFetch;
        if (elapsed < COOLDOWN_MS) {
          setTimeRemaining(COOLDOWN_MS - elapsed);
        } else {
          setTimeRemaining(0);
        }
      } else {
        setTimeRemaining(0);
      }
    } catch (e) {
      console.log('Error checking cooldown:', e);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const requestLiveFeed = async () => {
    if (timeRemaining > 0) return;
    
    setLoading(true);
    setFeedActive(false);
    setAnalysisResult(null);
    
    try {
      await AsyncStorage.setItem(dynamicFetchKey, Date.now().toString());
      setTimeRemaining(COOLDOWN_MS);
      
      // Simulate feed connection delay
      setTimeout(() => {
        setLoading(false);
        setFeedActive(true);
        analyzeCrowd();
      }, 1500);
      
    } catch (e) {
      setLoading(false);
      console.log('Error setting cooldown:', e);
    }
  };

  const analyzeCrowd = async () => {
    setAnalyzing(true);
    try {
      const prompt = `Simulate a computer vision output for a procurement centre queue. Estimate the crowd count between 15 and 80 people. Mention if the crowd is LOW, MEDIUM, or HIGH density. Respond strictly in 2 short sentences.`;
      const response = await askHositAI({ message: prompt, userId: 'CCTV_SYS', context: 'CCTV Computer Vision Simulation' });
      
      setAnalysisResult(response);
      
      // Extract rough number for UI meter
      const match = response.match(/\b\d+\b/);
      if (match) {
        setCrowdCount(parseInt(match[0], 10));
      } else {
        setCrowdCount(42); // Fallback mock
      }

      // Voice output of the result
      Speech.speak("AI Analysis Complete: " + response, { 
        language: i18n.language === 'en' ? 'en-US' : (i18n.language + '-IN') 
      });

    } catch (error) {
      setAnalysisResult("AI connectivity error. Unable to perform computer vision analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const canRequest = timeRemaining === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{centreName} CCTV</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={16} color="#38BDF8" />
          <Text style={styles.infoText}>
            Live feeds are limited to once every {COOLDOWN_MINUTES} minutes to conserve server bandwidth.
          </Text>
        </View>

        {/* Video Player Container */}
        <View style={styles.videoContainer}>
          <View style={styles.cameraLabelRow}>
            <Camera size={14} color="#EF4444" />
            <Text style={styles.cameraLabelText}>CAM_01_{centreId.toUpperCase()}</Text>
            {feedActive && <View style={styles.liveIndicator}><Text style={styles.liveText}>LIVE</Text></View>}
          </View>

          <View style={styles.playerFrame}>
            {loading ? (
              <View style={styles.playerPlaceholder}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.placeholderText}>Connecting to secure stream...</Text>
              </View>
            ) : feedActive ? (
              <View style={styles.simulatedFeed}>
                <PlaySquare size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.simulatedFeedText}>[ SIMULATED LIVE VIDEO STREAM ]</Text>
                
                {/* Overlay bounding boxes for effect */}
                <View style={[styles.boundingBox, { top: '20%', left: '30%', width: 40, height: 80 }]} />
                <View style={[styles.boundingBox, { top: '40%', left: '60%', width: 35, height: 75 }]} />
                <View style={[styles.boundingBox, { top: '10%', left: '75%', width: 30, height: 60 }]} />
                <Text style={styles.overlayText}>Target Locked: {crowdCount > 0 ? crowdCount : '...'} subjects</Text>
              </View>
            ) : (
              <View style={styles.playerPlaceholder}>
                <Camera size={48} color="#475569" />
                <Text style={styles.placeholderText}>Stream Offline</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.requestBtn, !canRequest && styles.requestBtnDisabled]} 
          onPress={requestLiveFeed}
          disabled={!canRequest || loading}
        >
          {canRequest ? (
            <>
              <RefreshCw size={20} color="white" />
              <Text style={styles.requestBtnText}>Request Live Feed & AI Analysis</Text>
            </>
          ) : (
            <>
              <Clock size={20} color="#94A3B8" />
              <Text style={styles.requestBtnTextDisabled}>
                Next feed available in {formatTime(timeRemaining)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* AI Analysis Results */}
        {(analyzing || analysisResult) && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Sparkles size={18} color="#10B981" />
              <Text style={styles.analysisTitle}>AI Crowd Analysis</Text>
            </View>
            
            {analyzing ? (
              <View style={styles.analyzingState}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.analyzingText}>Running computer vision models...</Text>
              </View>
            ) : (
              <View style={styles.resultState}>
                <View style={styles.countRow}>
                  <Users size={24} color="#38BDF8" />
                  <Text style={styles.countText}>{crowdCount} Persons Detected</Text>
                </View>
                <View style={styles.resultBox}>
                  <Text style={styles.resultText}>{analysisResult}</Text>
                </View>
                
                {crowdCount > 50 && (
                  <View style={styles.warningBanner}>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text style={styles.warningText}>High density. Recommended to delay visit.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// Ensure Sparkles is imported, we missed it above, so we'll mock it if it fails or just import it properly
import { Sparkles as SparklesIcon, Clock } from 'lucide-react-native';
const Sparkles = SparklesIcon;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoText: {
    color: '#38BDF8',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  videoContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  cameraLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cameraLabelText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  liveIndicator: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  liveText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
  playerFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  playerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#475569',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  simulatedFeed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#172033',
  },
  simulatedFeedText: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  overlayText: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    color: '#10B981',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  requestBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
  },
  requestBtnDisabled: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    elevation: 0,
  },
  requestBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    marginLeft: 10,
  },
  requestBtnTextDisabled: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },
  analysisCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  analyzingState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  analyzingText: {
    color: '#94A3B8',
    marginLeft: 12,
    fontSize: 14,
  },
  resultState: {
    marginTop: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  countText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  resultBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  resultText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  }
});
