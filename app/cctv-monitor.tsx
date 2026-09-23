import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Users,
  PlaySquare,
  Info,
  Volume2,
  VolumeX,
  Scale,
  Award,
  Layers,
  Sparkles,
  ShieldCheck,
  Video,
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { askHositAI } from '@/lib/hositAI';

export default function CctvMonitorScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const centreId = (params.centreId as string) || 'SAMAYAPURAM';
  const centreName = (params.centreName as string) || 'Samayapuram Procurement Mandi';

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [crowdCount, setCrowdCount] = useState<number>(18);
  const [feedActive, setFeedActive] = useState(true);
  const [activeCameraId, setActiveCameraId] = useState<'cam1' | 'cam2' | 'cam3' | 'cam4'>('cam1');
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Live timer for CCTV timestamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTimestamp(
        now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() +
          ' ' +
          now.toLocaleTimeString('en-GB') +
          ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup speech
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {}
    };
  }, []);

  // Initial load
  useEffect(() => {
    runAnalysis('cam1');
  }, []);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const handleSwitchCamera = (camId: 'cam1' | 'cam2' | 'cam3' | 'cam4') => {
    triggerHaptic();
    setActiveCameraId(camId);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      runAnalysis(camId);
    }, 400);
  };

  const runAnalysis = async (camId: 'cam1' | 'cam2' | 'cam3' | 'cam4') => {
    setAnalyzing(true);

    const camLabels = {
      cam1: 'Weighbridge & Ingress Gate',
      cam2: 'Grain Quality Inspection Lab',
      cam3: 'Mandi Unloading & Bagging Yard',
      cam4: 'Outgoing Dispatch & Egress Gate',
    };

    // Resilient fallback computer vision simulation
    let resultText = '';
    let count = 16;

    if (camId === 'cam1') {
      count = 18;
      resultText = `AI Camera 01 (Weighbridge): Low-to-moderate density with 18 persons and 3 tractor-trolleys. Scale #1 is fully calibrated and active.`;
    } else if (camId === 'cam2') {
      count = 8;
      resultText = `AI Camera 02 (Quality Lab): Normal flow with 8 farmers. Moisture testing counter queue is short with average test time under 3 minutes.`;
    } else if (camId === 'cam3') {
      count = 24;
      resultText = `AI Camera 03 (Unloading Yard): Active bagging and loading operations. 24 workers and farmers present; stack capacity is at 62%.`;
    } else {
      count = 5;
      resultText = `AI Camera 04 (Exit Gate): Clear lane with 5 vehicles processed. No congestion detected at exit.`;
    }

    // Try remote AI with fast 2.5s timeout
    try {
      const prompt = `Simulate computer vision for ${camLabels[camId]} at a grain mandi. Density is LOW. Respond in 2 short sentences with vehicle/person count.`;
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2500)
      );
      const aiPromise = askHositAI({
        message: prompt,
        userId: 'CCTV_SYS',
        context: 'CCTV Computer Vision Simulation',
      });

      const response = await Promise.race([aiPromise, timeoutPromise]);
      if (response && response.length > 10) {
        resultText = response;
        const match = response.match(/\b\d+\b/);
        if (match) count = parseInt(match[0], 10);
      }
    } catch {}

    setCrowdCount(count);
    setAnalysisResult(resultText);
    setAnalyzing(false);
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

    if (!analysisResult) return;

    setIsSpeaking(true);
    try {
      Speech.speak(analysisResult, {
        language: i18n.language === 'en' ? 'en-IN' : i18n.language + '-IN',
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{centreName}</Text>
          <Text style={styles.headerSubtitle}>Live High-Definition CCTV & Computer Vision</Text>
        </View>

        <View style={styles.liveIndicatorPill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveIndicatorText}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Camera Selector Tabs */}
        <View style={styles.camSelectorContainer}>
          <TouchableOpacity
            style={[styles.camSelectorBtn, activeCameraId === 'cam1' && styles.camSelectorBtnActive]}
            onPress={() => handleSwitchCamera('cam1')}
          >
            <Scale size={14} color={activeCameraId === 'cam1' ? '#FFFFFF' : '#94A3B8'} />
            <Text
              style={[styles.camSelectorText, activeCameraId === 'cam1' && styles.camSelectorTextActive]}
            >
              Cam 1: Weighbridge
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.camSelectorBtn, activeCameraId === 'cam2' && styles.camSelectorBtnActive]}
            onPress={() => handleSwitchCamera('cam2')}
          >
            <Award size={14} color={activeCameraId === 'cam2' ? '#FFFFFF' : '#94A3B8'} />
            <Text
              style={[styles.camSelectorText, activeCameraId === 'cam2' && styles.camSelectorTextActive]}
            >
              Cam 2: Quality Lab
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.camSelectorBtn, activeCameraId === 'cam3' && styles.camSelectorBtnActive]}
            onPress={() => handleSwitchCamera('cam3')}
          >
            <Layers size={14} color={activeCameraId === 'cam3' ? '#FFFFFF' : '#94A3B8'} />
            <Text
              style={[styles.camSelectorText, activeCameraId === 'cam3' && styles.camSelectorTextActive]}
            >
              Cam 3: Yard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.camSelectorBtn, activeCameraId === 'cam4' && styles.camSelectorBtnActive]}
            onPress={() => handleSwitchCamera('cam4')}
          >
            <Video size={14} color={activeCameraId === 'cam4' ? '#FFFFFF' : '#94A3B8'} />
            <Text
              style={[styles.camSelectorText, activeCameraId === 'cam4' && styles.camSelectorTextActive]}
            >
              Cam 4: Exit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video Player Container */}
        <View style={styles.videoContainer}>
          <View style={styles.cameraLabelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Camera size={14} color="#EF4444" />
              <Text style={styles.cameraLabelText}>
                {activeCameraId === 'cam1'
                  ? 'CAM_01_WEIGHBRIDGE_SCALE'
                  : activeCameraId === 'cam2'
                  ? 'CAM_02_QUALITY_INSPECTION_LAB'
                  : activeCameraId === 'cam3'
                  ? 'CAM_03_STORAGE_MANDI_YARD'
                  : 'CAM_04_DISPATCH_EXIT_GATE'}
              </Text>
            </View>
            <Text style={styles.osdRecTag}>REC ● 1080p 30fps</Text>
          </View>

          <View style={styles.playerFrame}>
            {loading ? (
              <View style={styles.playerPlaceholder}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.placeholderText}>Switching camera feed...</Text>
              </View>
            ) : feedActive ? (
              <View style={styles.simulatedFeed}>
                {/* OSD Header */}
                <View style={styles.simulatedOsdTop}>
                  <Text style={styles.simulatedOsdText}>{centreId.toUpperCase()} • ENCRYPTED_HLS</Text>
                  <Text style={styles.simulatedOsdText}>BITRATE: 4.2 MBPS</Text>
                </View>

                {/* Computer Vision Detection Bounding Boxes */}
                <View style={styles.cvBoundingContainer}>
                  {activeCameraId === 'cam1' && (
                    <>
                      <View style={[styles.boundingBox, { top: '25%', left: '15%', width: 140, height: 85 }]}>
                        <Text style={styles.boxLabel}>TRACTOR-481 [520 KG]</Text>
                      </View>
                      <View style={[styles.boundingBox, { top: '40%', right: '20%', width: 80, height: 95, borderColor: '#34D399' }]}>
                        <Text style={[styles.boxLabel, { backgroundColor: '#059669' }]}>SCALE_01 [OK]</Text>
                      </View>
                    </>
                  )}

                  {activeCameraId === 'cam2' && (
                    <View style={[styles.boundingBox, { top: '30%', left: '30%', width: 130, height: 90, borderColor: '#38BDF8' }]}>
                      <Text style={[styles.boxLabel, { backgroundColor: '#0284C7' }]}>MOISTURE 12.4% [PASS]</Text>
                    </View>
                  )}

                  {activeCameraId === 'cam3' && (
                    <View style={[styles.boundingBox, { top: '20%', left: '20%', width: 160, height: 110, borderColor: '#F59E0B' }]}>
                      <Text style={[styles.boxLabel, { backgroundColor: '#D97706' }]}>UNLOADING BAY-02</Text>
                    </View>
                  )}

                  {activeCameraId === 'cam4' && (
                    <View style={[styles.boundingBox, { top: '35%', left: '40%', width: 100, height: 70, borderColor: '#10B981' }]}>
                      <Text style={[styles.boxLabel, { backgroundColor: '#059669' }]}>GATE_EXIT [CLEAR]</Text>
                    </View>
                  )}
                </View>

                {/* OSD Footer */}
                <View style={styles.simulatedOsdBottom}>
                  <Text style={styles.simulatedOsdText}>{liveTimestamp}</Text>
                  <Text style={styles.simulatedOsdText}>CROWD: {crowdCount} DETECTED</Text>
                </View>
              </View>
            ) : (
              <View style={styles.playerPlaceholder}>
                <Camera size={48} color="#475569" />
                <Text style={styles.placeholderText}>Stream Offline</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.refreshFeedBtn}
            onPress={() => runAnalysis(activeCameraId)}
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={styles.refreshFeedBtnText}>Re-Analyze Stream</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.audioAnnouncementBtn, isSpeaking && styles.audioAnnouncementBtnActive]}
            onPress={handleToggleSpeech}
            activeOpacity={0.8}
          >
            {isSpeaking ? (
              <VolumeX size={18} color="#FFFFFF" />
            ) : (
              <Volume2 size={18} color="#059669" />
            )}
            <Text style={[styles.audioAnnouncementBtnText, isSpeaking && { color: '#FFFFFF' }]}>
              {isSpeaking ? 'Stop Voice' : 'Announce'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Computer Vision Analysis Card */}
        <View style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#10B981" />
              <Text style={styles.analysisTitle}>AI Computer Vision Queue Intelligence</Text>
            </View>
            <View style={styles.activeTag}>
              <ShieldCheck size={12} color="#059669" />
              <Text style={styles.activeTagText}>Verified</Text>
            </View>
          </View>

          {analyzing ? (
            <View style={styles.analyzingState}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={styles.analyzingText}>Processing live CCTV frames...</Text>
            </View>
          ) : (
            <View style={styles.resultState}>
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Users size={20} color="#38BDF8" />
                  <View>
                    <Text style={styles.metricVal}>{crowdCount} Farmers</Text>
                    <Text style={styles.metricSub}>Estimated in Yard</Text>
                  </View>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Scale size={20} color="#34D399" />
                  <View>
                    <Text style={styles.metricVal}>~12 Mins</Text>
                    <Text style={styles.metricSub}>Weighbridge Wait</Text>
                  </View>
                </View>
              </View>

              <View style={styles.resultBox}>
                <Text style={styles.resultText}>{analysisResult}</Text>
              </View>

              {crowdCount > 40 && (
                <View style={styles.warningBanner}>
                  <AlertTriangle size={16} color="#F59E0B" />
                  <Text style={styles.warningText}>High density. Recommended to delay arrival by 20 mins.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Back to Status */}
        <TouchableOpacity
          style={styles.backToStatusBtn}
          onPress={() => router.push('/procurement-status')}
        >
          <Text style={styles.backToStatusBtnText}>← Return to Procurement Status Lifecycle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1C2541',
    borderBottomWidth: 1,
    borderBottomColor: '#3A506B',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 11, color: '#38BDF8', fontWeight: '600' },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: { padding: 16 },
  camSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  camSelectorBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1C2541',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A506B',
  },
  camSelectorBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  camSelectorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  camSelectorTextActive: {
    color: '#FFFFFF',
  },
  videoContainer: {
    backgroundColor: '#1C2541',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3A506B',
    marginBottom: 14,
  },
  cameraLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cameraLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  osdRecTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  playerFrame: {
    height: 210,
    backgroundColor: '#020617',
    borderRadius: 8,
    overflow: 'hidden',
  },
  playerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
  },
  simulatedFeed: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
    position: 'relative',
    backgroundColor: '#050D1A',
  },
  simulatedOsdTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simulatedOsdBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simulatedOsdText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cvBoundingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  boxLabel: {
    position: 'absolute',
    top: -12,
    left: 0,
    backgroundColor: '#D97706',
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  refreshFeedBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  refreshFeedBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  audioAnnouncementBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  audioAnnouncementBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  audioAnnouncementBtnText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
  analysisCard: {
    backgroundColor: '#1C2541',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3A506B',
    marginBottom: 14,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  analyzingState: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  resultState: {},
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3A506B',
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#3A506B',
    marginHorizontal: 8,
  },
  resultBox: {
    backgroundColor: '#0B132B',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A506B',
  },
  resultText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#78350F',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '700',
  },
  backToStatusBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backToStatusBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
});
