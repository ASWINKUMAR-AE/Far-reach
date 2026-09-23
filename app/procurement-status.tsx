import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Video,
  Camera,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Users,
  Scale,
  Award,
  Sparkles,
  Play,
  Layers,
  MapPin,
} from 'lucide-react-native';
import { getActiveBooking, getProcurementRecord } from '@/lib/procurementService';
import { ProcurementBooking, ProcurementRecord } from '@/lib/types';

export default function ProcurementStatusScreen() {
  const [booking, setBooking] = useState<ProcurementBooking | null>(null);
  const [record, setRecord] = useState<ProcurementRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // CCTV Live Stream State
  const [activeCam, setActiveCam] = useState<'weighbridge' | 'quality' | 'unloading'>('weighbridge');
  const [liveTime, setLiveTime] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  // Live timer for CCTV timestamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
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

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  useEffect(() => {
    async function load() {
      try {
        const b = await getActiveBooking();
        const r = await getProcurementRecord();
        setBooking(b);
        setRecord(r);
      } catch (e) {
        console.warn('Error loading procurement status:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleSpeech = () => {
    triggerHaptic();
    if (isSpeaking) {
      try {
        Speech.stop();
      } catch {}
      setIsSpeaking(false);
      return;
    }

    const camName =
      activeCam === 'weighbridge'
        ? 'Weighbridge and Entry Gate'
        : activeCam === 'quality'
        ? 'Quality Testing Counter'
        : 'Unloading Mandi Yard';

    const speechText = `Live CCTV status for ${booking?.centreName || 'Samayapuram Centre'}: Currently monitoring ${camName}. Crowd density is low with 14 farmers in the yard. Estimated queue waiting time is approximately 12 minutes. Weighbridge scale is active and token processing is moving smoothly.`;

    setIsSpeaking(true);
    try {
      Speech.speak(speechText, {
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

  const handleRefreshFeed = () => {
    triggerHaptic();
    setIsRefreshingFeed(true);
    setTimeout(() => {
      setIsRefreshingFeed(false);
    }, 800);
  };

  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loadingText}>Fetching Procurement Timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 9-stage procurement lifecycle timeline
  const stages = [
    { title: '1. Farmer Registration', desc: 'Verified Member (ID: F1021)', completed: true, route: null },
    { title: '2. Crop Declaration', desc: `${booking.crop} - ${booking.quantityKg} kg`, completed: true, route: null },
    { title: '3. Smart Slot Booked', desc: `Token #${booking.token} @ ${booking.centreName}`, completed: true, route: null },
    { title: '4. Gate Check-in', desc: 'Checked in & QR Validated at Entrance', completed: booking.status !== 'BOOKED', route: '/checkin' },
    { title: '5. Digital Weighing', desc: 'Gross 520 kg - Tare 20 kg = Net 500 kg', completed: ['WEIGHING', 'QUALITY_CHECK', 'PROCUREMENT_ACCEPTED', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED'].includes(booking.status), route: '/weighing' },
    { title: '6. Quality Check', desc: 'Grade A Passed (Moisture 12.4%)', completed: ['QUALITY_CHECK', 'PROCUREMENT_ACCEPTED', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED'].includes(booking.status), route: '/quality-check' },
    { title: '7. Procurement Accepted', desc: 'Confirmed @ ₹23.50/kg = ₹11,750', completed: ['PROCUREMENT_ACCEPTED', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED'].includes(booking.status), route: null },
    { title: '8. Payment Initiated', desc: 'DBT Direct Transfer Processing', completed: ['PAYMENT_INITIATED', 'PAYMENT_COMPLETED'].includes(booking.status) || record?.paymentStatus === 'PROCESSING', route: '/payment' },
    { title: '9. Payment Completed', desc: 'Credited to Bank Account via PFMS', completed: record?.paymentStatus === 'COMPLETED', route: '/(tabs)/payments' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Procurement Status</Text>
            <Text style={styles.headerSubtitle}>Live Tracking & Video Verification</Text>
          </View>
        </View>

        {/* Overview Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>CURRENT ACTIVE PROCUREMENT</Text>
              <Text style={styles.cropTitle}>
                {booking.crop} ({booking.quantityKg} kg)
              </Text>
              <Text style={styles.centreSub}>
                {booking.centreName} • Token #{booking.token}
              </Text>
            </View>
            <View style={styles.tokenPill}>
              <Text style={styles.tokenPillText}>TOKEN #{booking.token}</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>SLOT TIME</Text>
              <Text style={styles.heroStatVal}>{booking.slot || '10:30 AM'}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>CURRENT STATUS</Text>
              <Text style={[styles.heroStatVal, { color: '#059669' }]}>
                {booking.status.replace(/_/g, ' ')}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>GATE WAIT ETA</Text>
              <Text style={styles.heroStatVal}>~12 Mins</Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* DEDICATED LIVE CCTV FOOTAGE VIEWER FOR PROCUREMENT STATUS */}
        {/* ============================================================== */}
        <View style={styles.cctvContainer}>
          <View style={styles.cctvHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Camera size={18} color="#059669" />
              <Text style={styles.cctvSectionTitle}>Live Centre CCTV Surveillance</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* LIVE Red Pulse Badge */}
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>

              {/* Speech Readout Button */}
              <TouchableOpacity
                style={[styles.cctvAudioBtn, isSpeaking && styles.cctvAudioBtnActive]}
                onPress={handleToggleSpeech}
                accessibilityLabel="Listen to live CCTV announcement"
              >
                {isSpeaking ? (
                  <VolumeX size={15} color="#FFFFFF" />
                ) : (
                  <Volume2 size={15} color="#059669" />
                )}
                <Text style={[styles.cctvAudioBtnText, isSpeaking && { color: '#FFFFFF' }]}>
                  {isSpeaking ? 'Stop' : 'Voice'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Camera Angle Selector Tabs */}
          <View style={styles.camSelectorRow}>
            <TouchableOpacity
              style={[styles.camPill, activeCam === 'weighbridge' && styles.camPillActive]}
              onPress={() => {
                triggerHaptic();
                setActiveCam('weighbridge');
              }}
            >
              <Scale size={13} color={activeCam === 'weighbridge' ? '#FFFFFF' : '#475569'} />
              <Text style={[styles.camPillText, activeCam === 'weighbridge' && styles.camPillTextActive]}>
                Cam 1: Weighbridge
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.camPill, activeCam === 'quality' && styles.camPillActive]}
              onPress={() => {
                triggerHaptic();
                setActiveCam('quality');
              }}
            >
              <Award size={13} color={activeCam === 'quality' ? '#FFFFFF' : '#475569'} />
              <Text style={[styles.camPillText, activeCam === 'quality' && styles.camPillTextActive]}>
                Cam 2: Quality Lab
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.camPill, activeCam === 'unloading' && styles.camPillActive]}
              onPress={() => {
                triggerHaptic();
                setActiveCam('unloading');
              }}
            >
              <Layers size={13} color={activeCam === 'unloading' ? '#FFFFFF' : '#475569'} />
              <Text style={[styles.camPillText, activeCam === 'unloading' && styles.camPillTextActive]}>
                Cam 3: Storage Mandi
              </Text>
            </TouchableOpacity>
          </View>

          {/* Interactive CCTV Video Screen Frame */}
          <View style={styles.videoPlayerFrame}>
            {isRefreshingFeed ? (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="#34D399" />
                <Text style={styles.videoLoadingText}>Connecting to Encrypted Stream...</Text>
              </View>
            ) : (
              <View style={styles.cctvStreamCanvas}>
                {/* Security Camera On-Screen Display (OSD) Overlay */}
                <View style={styles.osdTopBar}>
                  <View style={styles.osdCamTag}>
                    <Text style={styles.osdCamText}>
                      {activeCam === 'weighbridge'
                        ? 'CAM-01 [GATE_WEIGHBRIDGE]'
                        : activeCam === 'quality'
                        ? 'CAM-02 [QUALITY_TESTING_LAB]'
                        : 'CAM-03 [UNLOADING_MANDI_YARD]'}
                    </Text>
                  </View>
                  <Text style={styles.osdRecText}>REC ● 30 FPS • 4.2 Mbps</Text>
                </View>

                {/* Computer Vision Detection Simulation Grid */}
                <View style={styles.cvDetectionLayer}>
                  {activeCam === 'weighbridge' && (
                    <>
                      <View style={[styles.cvBoundingBox, { top: '22%', left: '15%', width: 140, height: 90 }]}>
                        <Text style={styles.cvBoxLabel}>TRACTOR-TROLLEY #481 [520 KG]</Text>
                      </View>
                      <View style={[styles.cvBoundingBox, { top: '35%', right: '18%', width: 85, height: 110, borderColor: '#34D399' }]}>
                        <Text style={[styles.cvBoxLabel, { backgroundColor: '#059669' }]}>SCALE_01 [CALIBRATED]</Text>
                      </View>
                      <View style={[styles.cvBoundingBox, { bottom: '15%', left: '38%', width: 70, height: 80, borderColor: '#38BDF8' }]}>
                        <Text style={[styles.cvBoxLabel, { backgroundColor: '#0284C7' }]}>FARMER-147 [VERIFIED]</Text>
                      </View>
                    </>
                  )}

                  {activeCam === 'quality' && (
                    <>
                      <View style={[styles.cvBoundingBox, { top: '20%', left: '25%', width: 120, height: 100 }]}>
                        <Text style={styles.cvBoxLabel}>MOISTURE METER [12.4% PASS]</Text>
                      </View>
                      <View style={[styles.cvBoundingBox, { bottom: '20%', right: '25%', width: 110, height: 80, borderColor: '#34D399' }]}>
                        <Text style={[styles.cvBoxLabel, { backgroundColor: '#059669' }]}>SAMPLE A-GRADE [APPROVED]</Text>
                      </View>
                    </>
                  )}

                  {activeCam === 'unloading' && (
                    <>
                      <View style={[styles.cvBoundingBox, { top: '18%', left: '30%', width: 150, height: 110 }]}>
                        <Text style={styles.cvBoxLabel}>BAY-02 [PADDY BAGGING ACTIVE]</Text>
                      </View>
                      <View style={[styles.cvBoundingBox, { bottom: '25%', left: '10%', width: 90, height: 75, borderColor: '#F59E0B' }]}>
                        <Text style={[styles.cvBoxLabel, { backgroundColor: '#D97706' }]}>STACK CAPACITY: 64%</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* CCTV Timestamp & Location Footer */}
                <View style={styles.osdBottomBar}>
                  <Text style={styles.osdTimeText}>{liveTime}</Text>
                  <Text style={styles.osdLocationText}>SAMAYAPURAM DPC • GATE 1</Text>
                </View>
              </View>
            )}

            {/* Video Control Bar */}
            <View style={styles.cctvBottomControls}>
              <View style={styles.crowdIndicatorBox}>
                <Users size={14} color="#059669" />
                <Text style={styles.crowdIndicatorText}>
                  Crowd:{' '}
                  <Text style={{ fontWeight: '800', color: '#166534' }}>
                    14 Farmers (LOW DENSITY)
                  </Text>{' '}
                  • Queue: 3 Trucks
                </Text>
              </View>

              <View style={styles.controlButtonsGroup}>
                <TouchableOpacity
                  style={styles.refreshControlBtn}
                  onPress={handleRefreshFeed}
                  accessibilityLabel="Refresh live CCTV stream"
                >
                  <RefreshCw size={14} color="#0F172A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fullscreenControlBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/cctv-monitor',
                      params: { centreId: booking.centreId, centreName: booking.centreName },
                    })
                  }
                  accessibilityLabel="Open Fullscreen CCTV Console"
                >
                  <Maximize2 size={14} color="#FFFFFF" />
                  <Text style={styles.fullscreenBtnText}>Expand</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Shortcuts to Related Monitors */}
          <View style={styles.cctvSubLinksRow}>
            <TouchableOpacity
              style={styles.cctvSubLink}
              onPress={() => router.push('/cctv-monitor')}
            >
              <Video size={14} color="#059669" />
              <Text style={styles.cctvSubLinkText}>Full CCTV Console</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cctvSubLink}
              onPress={() => router.push('/crowd-monitoring')}
            >
              <Users size={14} color="#059669" />
              <Text style={styles.cctvSubLinkText}>Crowd Heatmap & Wait Time</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 9-Stage Vertical Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineHeader}>End-to-End Visual Timeline</Text>

          {stages.map((stage, idx) => (
            <View key={idx} style={styles.timelineRow}>
              <View style={styles.iconCol}>
                <View
                  style={[
                    styles.circle,
                    stage.completed ? styles.circleDone : styles.circlePending,
                  ]}
                >
                  {stage.completed ? (
                    <CheckCircle2 size={16} color="white" />
                  ) : (
                    <Clock size={14} color="#94A3B8" />
                  )}
                </View>
                {idx < stages.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      stage.completed ? styles.lineDone : styles.linePending,
                    ]}
                  />
                )}
              </View>

              <View style={styles.textCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.stageTitle, stage.completed && styles.titleDone]}>
                    {stage.title}
                  </Text>
                  {stage.route && (
                    <TouchableOpacity
                      onPress={() => router.push(stage.route as any)}
                      style={styles.stageActionLink}
                    >
                      <Text style={styles.stageActionLinkText}>View Details →</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.stageDesc}>{stage.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons for Direct Navigation */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {/* Quick Stage Shortcuts */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push('/weighing')}
              style={styles.splitActionBtn}
            >
              <Scale size={18} color="#166534" />
              <Text style={styles.splitActionBtnText}>Weighing Slip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/quality-check')}
              style={styles.splitActionBtn}
            >
              <Award size={18} color="#166534" />
              <Text style={styles.splitActionBtnText}>Quality Certificate</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Progression */}
          {booking.status === 'PROCUREMENT_ACCEPTED' && (
            <TouchableOpacity
              onPress={() => router.push('/payment')}
              style={styles.primaryBtn}
            >
              <CreditCard size={20} color="white" />
              <Text style={styles.primaryBtnText}>Proceed to Secure Payment</Text>
              <ArrowRight size={20} color="white" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/payments')}
            style={styles.tertiaryBtn}
          >
            <Text style={styles.tertiaryBtnText}>Track Payment & DBT Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#166534', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  heroCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroLabel: { fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 1 },
  cropTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  centreSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  tokenPill: {
    backgroundColor: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokenPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  heroStatVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  cctvContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cctvHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cctvSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
  },
  cctvAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  cctvAudioBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  cctvAudioBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  camSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  camPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  camPillActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  camPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  camPillTextActive: {
    color: '#FFFFFF',
  },
  videoPlayerFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  videoLoadingOverlay: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  videoLoadingText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  cctvStreamCanvas: {
    height: 180,
    backgroundColor: '#020617',
    padding: 10,
    justifyContent: 'space-between',
    position: 'relative',
  },
  osdTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  osdCamTag: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  osdCamText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  osdRecText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cvDetectionLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cvBoundingBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  cvBoxLabel: {
    position: 'absolute',
    top: -12,
    left: 0,
    backgroundColor: '#D97706',
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  osdBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  osdTimeText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  osdLocationText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cctvBottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  crowdIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  crowdIndicatorText: {
    fontSize: 11,
    color: '#475569',
  },
  controlButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshControlBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  fullscreenControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#166534',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  fullscreenBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cctvSubLinksRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cctvSubLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingVertical: 7,
    borderRadius: 8,
  },
  cctvSubLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  timelineCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  timelineHeader: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  timelineRow: { flexDirection: 'row', marginBottom: 14 },
  iconCol: { alignItems: 'center', width: 28 },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  circleDone: { backgroundColor: '#166534' },
  circlePending: { backgroundColor: '#E2E8F0' },
  line: { width: 2, height: 34, marginTop: -3 },
  lineDone: { backgroundColor: '#166534' },
  linePending: { backgroundColor: '#CBD5E1' },
  textCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  stageTitle: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  titleDone: { color: '#0F172A', fontWeight: '800' },
  stageDesc: { fontSize: 11, color: '#64748B', marginTop: 1 },
  stageActionLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#DCFCE7',
  },
  stageActionLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  splitActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#166534',
  },
  splitActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
  tertiaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tertiaryBtnText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
});
