import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  QrCode, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  MapPin,
  CheckSquare,
  Camera
} from 'lucide-react-native';
import { 
  getActiveBooking, 
  getProcurementCentres, 
  calculateFullQueueDetails, 
  saveActiveBooking,
  requestRequeue,
  reallocateCentre,
  INITIAL_CENTRES,
  INITIAL_BOOKING
} from '@/lib/procurementService';
import { ProcurementBooking, ProcurementCentre, FullQueueDetails } from '@/lib/types';
import { askHositAI } from '@/lib/hositAI';

export default function QueueScreen() {
  const [booking, setBooking] = useState<ProcurementBooking>(INITIAL_BOOKING);
  const [centres, setCentres] = useState<ProcurementCentre[]>(INITIAL_CENTRES);
  const [currentToken, setCurrentToken] = useState<number>(132);
  const [reallocationAdvice, setReallocationAdvice] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const active = await getActiveBooking();
    const centreList = await getProcurementCentres();
    setBooking(active || INITIAL_BOOKING);
    const availableCentres = centreList.length > 0 ? centreList : INITIAL_CENTRES;
    setCentres(availableCentres);

    const bookedCentre = availableCentres.find(c => c.id === active.centreId) || availableCentres[0];
    if (bookedCentre && bookedCentre.loadStatus === 'HIGH') {
      fetchReallocationAdvice(bookedCentre, availableCentres);
    }
  };

  const fetchReallocationAdvice = async (currentCentre: ProcurementCentre, allCentres: ProcurementCentre[]) => {
    const alternative = allCentres.find(c => c.loadStatus === 'LOW') || allCentres[0];
    const prompt = `Centre ${currentCentre.name} is at ${currentCentre.capacity}% load (${currentCentre.loadStatus}). Suggest reallocating farmer to ${alternative.name} (${alternative.capacity}% load). Explain in 1 short sentence.`;
    const advice = await askHositAI({ message: prompt, userId: 'F1021', context: 'Far Reach Queue AI' });
    setReallocationAdvice(advice);
  };

  const currentCentre = centres.find(c => c.id === booking?.centreId) || centres[0] || INITIAL_CENTRES[0];
  const farmerToken = booking?.token || 147;

  // Calculate full dynamic queue state using operational service logic
  const queueDetails: FullQueueDetails = calculateFullQueueDetails(farmerToken, currentToken, currentCentre);

  // Re-Queue Handler for missed token
  const handleRequeue = async () => {
    if (!booking) return;
    Alert.alert(
      "Re-Queue Request 🔄",
      `Would you like to rejoin the queue at ${currentCentre.name}? A new position token will be assigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Re-Queue",
          onPress: async () => {
            const updated = await requestRequeue(booking);
            setBooking(updated);
            Alert.alert("Success", `Assigned new Token #${updated.token}. Status: CHECKED IN.`);
          },
        },
      ]
    );
  };

  // Reallocation Handler with Farmer Confirmation
  const handleConfirmReallocation = async () => {
    const alternative = centres.find(c => c.loadStatus === 'LOW') || centres[0];
    Alert.alert(
      "Confirm Smart Reallocation 🔄",
      `Would you like to move your booking from ${currentCentre.name} to ${alternative.name}?\n\nEstimated Waiting Time will reduce to 18 minutes!`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Move",
          onPress: async () => {
            if (booking) {
              const updated = await reallocateCentre(booking, alternative);
              setBooking(updated);
              Alert.alert("Reallocated!", `Booking moved to ${alternative.name}. New Token #${updated.token}`);
            }
          },
        },
      ]
    );
  };

  // Check-In Navigation or Trigger
  const handleCheckInPress = async () => {
    if (booking.status === 'BOOKED') {
      const updated: ProcurementBooking = { ...booking, status: 'CHECKED_IN' };
      await saveActiveBooking(updated);
      setBooking(updated);
      Alert.alert("Checked In! ✓", "Your arrival has been recorded. Stand by for weighing.");
    } else {
      router.push('/checkin');
    }
  };

  // Timeline steps
  const timeline = [
    { label: 'REGISTRATION', completed: true },
    { label: 'SLOT BOOKED', completed: true },
    { label: 'CHECKED IN', completed: booking?.status !== 'BOOKED' },
    { label: 'WEIGHING', completed: booking?.status === 'WEIGHING' || booking?.status === 'QUALITY_CHECK' || booking?.status === 'PROCUREMENT_ACCEPTED' },
    { label: 'QUALITY CHECK', completed: booking?.status === 'QUALITY_CHECK' || booking?.status === 'PROCUREMENT_ACCEPTED' },
    { label: 'PROCUREMENT ACCEPTED', completed: booking?.status === 'PROCUREMENT_ACCEPTED' },
    { label: 'PAYMENT INITIATED', completed: booking?.status === 'PAYMENT_INITIATED' || booking?.status === 'PAYMENT_COMPLETED' },
    { label: 'PAYMENT RECEIVED', completed: booking?.status === 'PAYMENT_COMPLETED' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>FAR REACH LIVE QUEUE</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <RefreshCw size={16} color="#166534" />
            <Text style={styles.refreshText}>Sync Queue</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Alert Banner */}
        <View style={[
          styles.alertBanner, 
          queueDetails.alertLevel === 'SUCCESS' ? styles.alertSuccess :
          queueDetails.alertLevel === 'URGENT' ? styles.alertUrgent :
          queueDetails.alertLevel === 'WARNING' ? styles.alertWarning : styles.alertInfo
        ]}>
          <Sparkles size={18} color="white" />
          <Text style={styles.alertBannerText}>{queueDetails.statusMessage}</Text>
        </View>

        {/* Digital Token Card */}
        <View style={styles.tokenCard}>
          <View style={styles.tokenCardHeader}>
            <Text style={styles.tokenLabel}>YOUR DIGITAL TOKEN</Text>
            <View style={styles.bookedBadge}>
              <Text style={styles.bookedBadgeText}>{booking?.status || 'BOOKED'}</Text>
            </View>
          </View>

          <Text style={styles.tokenNumber}>#{farmerToken}</Text>

          <View style={styles.tokenDetails}>
            <Text style={styles.centreNameText}>{booking?.centreName || currentCentre?.name}</Text>
            <Text style={styles.slotText}>Slot: {booking?.slot || '10:30 AM - 11:00 AM'}</Text>
            <Text style={styles.cropText}>{booking?.crop} ({booking?.quantityKg} kg)</Text>
          </View>

          {/* Actions: Check-In or Re-Queue */}
          {queueDetails.isMissed ? (
            <TouchableOpacity style={styles.requeueButton} onPress={handleRequeue}>
              <RefreshCw size={18} color="white" />
              <Text style={styles.requeueButtonText}>REQUEST RE-QUEUE</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.checkinActionBtn} onPress={handleCheckInPress}>
              <CheckSquare size={18} color="white" />
              <Text style={styles.checkinActionText}>
                {booking.status === 'BOOKED' ? 'CHECK-IN AT ENTRY GATE' : 'VIEW GATE QR PASS'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* View CCTV Camera Button */}
        <TouchableOpacity 
          style={styles.cctvButton} 
          onPress={() => router.push({ pathname: '/cctv-monitor', params: { centreId: booking?.centreId || currentCentre?.id, centreName: booking?.centreName || currentCentre?.name } })}
        >
          <View style={styles.cctvIconContainer}>
            <Camera size={20} color="#F8FAFC" />
          </View>
          <View style={styles.cctvTextContainer}>
            <Text style={styles.cctvButtonTitle}>Procurement Area Camera (Live)</Text>
            <Text style={styles.cctvButtonSub}>View crowd density & wait conditions at {booking?.centreName || currentCentre?.name}</Text>
          </View>
          <ArrowRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Smart Centre Reallocation Alert */}
        {currentCentre?.loadStatus === 'HIGH' && (
          <View style={styles.reallocationCard}>
            <View style={styles.reallocHeader}>
              <AlertTriangle size={20} color="#DC2626" />
              <Text style={styles.reallocTitle}>HIGH CONGESTION DETECTED ({currentCentre?.capacity}%)</Text>
            </View>
            <Text style={styles.reallocDesc}>
              {currentCentre?.name} is experiencing high crowd load.
            </Text>
            {reallocationAdvice ? (
              <Text style={styles.reallocAdvice}>💡 {reallocationAdvice}</Text>
            ) : null}

            <TouchableOpacity style={styles.reallocButton} onPress={handleConfirmReallocation}>
              <Text style={styles.reallocButtonText}>VIEW & CONFIRM ALTERNATIVE CENTRE</Text>
              <ArrowRight size={16} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.reallocButton, { backgroundColor: '#475569', marginTop: 8 }]} 
              onPress={() => {
                const alternative = centres.find(c => c.loadStatus === 'LOW') || centres[0];
                router.push({ pathname: '/cctv-monitor', params: { centreId: alternative.id, centreName: alternative.name } });
              }}
            >
              <Text style={styles.reallocButtonText}>VIEW ALTERNATIVE CAMERA</Text>
              <Camera size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Queue Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>NOW SERVING</Text>
            <Text style={[styles.statBoxValue, { color: '#059669' }]}>#{currentToken}</Text>
            <Text style={styles.statBoxSub}>Current active token</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>FARMERS AHEAD</Text>
            <Text style={[styles.statBoxValue, { color: queueDetails.isMissed ? '#DC2626' : '#F59E0B' }]}>
              {queueDetails.farmersAhead}
            </Text>
            <Text style={styles.statBoxSub}>In front of you</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>DYNAMIC ETA</Text>
            <Text style={[styles.statBoxValue, { color: '#166534' }]}>
              ~{queueDetails.estimatedWaitingMinutes} min
            </Text>
            <Text style={styles.statBoxSub}>{queueDetails.processingSpeedMin} min / farmer</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>ASSIGNED DESK</Text>
            <Text style={[styles.statBoxValue, { color: '#2563EB' }]}>Counter {queueDetails.assignedCounter}</Text>
            <Text style={styles.statBoxSub}>Weighing Desk</Text>
          </View>
        </View>

        {/* Multi-Counter Status Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏛️ Multi-Counter Live Status</Text>
          <View style={styles.countersGrid}>
            {queueDetails.counters.map((c) => (
              <View key={c.counterNumber} style={styles.counterBox}>
                <View style={styles.counterHeader}>
                  <Layers size={14} color="#166534" />
                  <Text style={styles.counterTitle}>Counter {c.counterNumber}</Text>
                </View>
                <Text style={styles.counterToken}>#{c.currentToken}</Text>
                <Text style={styles.counterSpeed}>{c.processingSpeedMin}m/farmer</Text>
                <View style={[styles.counterBadge, c.status === 'ACTIVE' ? styles.activeBadge : styles.pausedBadge]}>
                  <Text style={styles.counterBadgeText}>{c.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Visual Procurement Progress Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Procurement Operational Timeline</Text>
          <View style={styles.timelineContainer}>
            {timeline.map((step, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={[styles.timelineDot, step.completed ? styles.dotDone : styles.dotPending]}>
                  {step.completed ? (
                    <CheckCircle2 size={14} color="white" />
                  ) : (
                    <Text style={styles.dotNumber}>{idx + 1}</Text>
                  )}
                </View>
                <Text style={[styles.timelineText, step.completed && styles.timelineTextDone]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF5' },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: { fontSize: 20, fontWeight: '900', color: '#166534' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  alertBanner: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  alertInfo: { backgroundColor: '#2563EB' },
  alertWarning: { backgroundColor: '#D97706' },
  alertUrgent: { backgroundColor: '#DC2626' },
  alertSuccess: { backgroundColor: '#16A34A' },
  alertBannerText: { color: 'white', fontWeight: '700', fontSize: 13, flex: 1 },
  tokenCard: {
    backgroundColor: '#0B3D2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 4,
  },
  tokenCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenLabel: { fontSize: 12, fontWeight: '800', color: '#86EFAC', letterSpacing: 1 },
  bookedBadge: { backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bookedBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  tokenNumber: { fontSize: 48, fontWeight: '900', color: 'white', marginVertical: 4 },
  tokenDetails: { alignItems: 'center', marginBottom: 16 },
  centreNameText: { fontSize: 16, fontWeight: '700', color: 'white', textAlign: 'center' },
  slotText: { fontSize: 13, color: '#A7F3D0', marginTop: 2 },
  cropText: { fontSize: 12, color: '#D1FAE5', marginTop: 2 },
  checkinActionBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinActionText: { color: 'white', fontWeight: '800', fontSize: 13 },
  requeueButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requeueButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  reallocationCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reallocHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reallocTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  reallocDesc: { fontSize: 13, color: '#7F1D1D', marginBottom: 6 },
  reallocAdvice: { fontSize: 13, color: '#7F1D1D', fontWeight: '600', marginBottom: 12 },
  reallocButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  reallocButtonText: { color: 'white', fontWeight: '800', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statBox: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  statBoxLabel: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  statBoxValue: { fontSize: 22, fontWeight: '900', marginVertical: 4 },
  statBoxSub: { fontSize: 11, color: '#94A3B8' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  countersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  counterBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  counterTitle: { fontSize: 12, fontWeight: '700', color: '#166534' },
  counterToken: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  counterSpeed: { fontSize: 11, color: '#64748B' },
  counterBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  activeBadge: { backgroundColor: '#DCFCE7' },
  pausedBadge: { backgroundColor: '#FEE2E2' },
  counterBadgeText: { fontSize: 9, fontWeight: '800', color: '#166534' },
  timelineContainer: { gap: 10 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: '#22C55E' },
  dotPending: { backgroundColor: '#CBD5E1' },
  dotNumber: { fontSize: 10, fontWeight: '700', color: '#475569' },
  timelineText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  timelineTextDone: { color: '#0F172A', fontWeight: '700' },
  cctvButton: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },
  cctvIconContainer: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginRight: 14,
  },
  cctvTextContainer: {
    flex: 1,
  },
  cctvButtonTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  cctvButtonSub: {
    color: '#94A3B8',
    fontSize: 12,
  }
});
