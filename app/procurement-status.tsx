import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react-native';
import { getActiveBooking, getProcurementRecord } from '@/lib/procurementService';
import { ProcurementBooking, ProcurementRecord } from '@/lib/types';

export default function ProcurementStatusScreen() {
  const [booking, setBooking] = useState<ProcurementBooking | null>(null);
  const [record, setRecord] = useState<ProcurementRecord | null>(null);
  const [loading, setLoading] = useState(true);

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
    { title: '1. Farmer Registration', desc: 'Verified Member (ID: F1021)', completed: true },
    { title: '2. Crop Declaration', desc: 'Paddy (A-Grade) - 500 kg', completed: true },
    { title: '3. Smart Slot Booked', desc: `Token #${booking.token} @ ${booking.centreName}`, completed: true },
    { title: '4. Gate Check-in', desc: 'Checked in & QR Validated', completed: booking.status !== 'BOOKED' },
    { title: '5. Digital Weighing', desc: 'Gross 520 kg - Tare 20 kg = Net 500 kg', completed: booking.status === 'WEIGHING' || booking.status === 'QUALITY_CHECK' || booking.status === 'PROCUREMENT_ACCEPTED' || booking.status === 'PAYMENT_INITIATED' || booking.status === 'PAYMENT_COMPLETED' },
    { title: '6. Quality Check', desc: 'Grade A Passed (Moisture 12.4%)', completed: booking.status === 'QUALITY_CHECK' || booking.status === 'PROCUREMENT_ACCEPTED' || booking.status === 'PAYMENT_INITIATED' || booking.status === 'PAYMENT_COMPLETED' },
    { title: '7. Procurement Accepted', desc: 'Confirmed @ ₹23.50/kg = ₹11,750', completed: booking.status === 'PROCUREMENT_ACCEPTED' || booking.status === 'PAYMENT_INITIATED' || booking.status === 'PAYMENT_COMPLETED' },
    { title: '8. Payment Initiated', desc: 'DBT Direct Transfer Processing', completed: booking.status === 'PAYMENT_INITIATED' || booking.status === 'PAYMENT_COMPLETED' || record?.paymentStatus === 'PROCESSING' },
    { title: '9. Payment Completed', desc: 'Credited to Bank Account', completed: record?.paymentStatus === 'COMPLETED' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Procurement Lifecycle</Text>
        </View>

        {/* Overview Header */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>CURRENT ACTIVE PROCUREMENT</Text>
          <Text style={styles.cropTitle}>{booking.crop} ({booking.quantityKg} kg)</Text>
          <Text style={styles.centreSub}>{booking.centreName} • Token #{booking.token}</Text>
        </View>

        {/* 9-Stage Vertical Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineHeader}>End-to-End Visual Timeline</Text>

          {stages.map((stage, idx) => (
            <View key={idx} style={styles.timelineRow}>
              <View style={styles.iconCol}>
                <View style={[styles.circle, stage.completed ? styles.circleDone : styles.circlePending]}>
                  {stage.completed ? (
                    <CheckCircle2 size={16} color="white" />
                  ) : (
                    <Clock size={14} color="#94A3B8" />
                  )}
                </View>
                {idx < stages.length - 1 && (
                  <View style={[styles.line, stage.completed ? styles.lineDone : styles.linePending]} />
                )}
              </View>

              <View style={styles.textCol}>
                <Text style={[styles.stageTitle, stage.completed && styles.titleDone]}>{stage.title}</Text>
                <Text style={styles.stageDesc}>{stage.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/payments')} style={styles.primaryBtn}>
            <CreditCard size={20} color="white" />
            <Text style={styles.primaryBtnText}>Track Payment & DBT Status</Text>
            <ArrowRight size={20} color="white" />
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
    padding: 16,
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  heroCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    elevation: 3,
  },
  heroLabel: { fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 1 },
  cropTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  centreSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  timelineCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  timelineHeader: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  iconCol: { alignItems: 'center', width: 30 },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  circleDone: { backgroundColor: '#166534' },
  circlePending: { backgroundColor: '#E2E8F0' },
  line: { width: 2, height: 36, marginTop: -4 },
  lineDone: { backgroundColor: '#166534' },
  linePending: { backgroundColor: '#CBD5E1' },
  textCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  stageTitle: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  titleDone: { color: '#0F172A', fontWeight: '900' },
  stageDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
});
