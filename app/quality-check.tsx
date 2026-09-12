import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle2, ShieldCheck, Droplets, Award, Clock, ArrowRight } from 'lucide-react-native';
import { getActiveBooking, getProcurementRecord } from '@/lib/procurementService';
import { ProcurementBooking, ProcurementRecord } from '@/lib/types';

export default function QualityCheckScreen() {
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
        console.warn('Error loading quality check:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !booking || !record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loadingText}>Fetching Inspector Quality Certificate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleProceedToPayment = () => {
    router.push('/(tabs)/payments');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quality Transparency</Text>
        </View>

        {/* Certificate Card */}
        <View style={styles.certCard}>
          <View style={styles.certHeader}>
            <ShieldCheck size={28} color="#166534" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.certTitle}>Mandi Quality Certificate</Text>
              <Text style={styles.certSub}>Inspected by Quality Officer #402</Text>
            </View>
          </View>

          <View style={styles.statusBadge}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.statusBadgeText}>QUALITY PASSED (GRADE A)</Text>
          </View>
        </View>

        {/* Quality Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Award size={24} color="#166534" />
            <Text style={styles.metricVal}>{record.qualityGrade}</Text>
            <Text style={styles.metricLabel}>Assigned Grade</Text>
          </View>

          <View style={styles.metricCard}>
            <Droplets size={24} color="#0284C7" />
            <Text style={styles.metricVal}>{record.moisturePercentage}%</Text>
            <Text style={styles.metricLabel}>Moisture Content (Limit &lt; 14%)</Text>
          </View>
        </View>

        {/* Breakdown Summary */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Inspection Summary</Text>

          <View style={styles.detailRow}>
            <Text style={styles.dtLabel}>Commodity Variety:</Text>
            <Text style={styles.dtValue}>{record.crop}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.dtLabel}>Validated Net Weight:</Text>
            <Text style={styles.dtValue}>{record.netWeightKg} kg</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.dtLabel}>Govt Minimum Support Price:</Text>
            <Text style={styles.dtValue}>₹{record.ratePerKg}/kg</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.dtLabel}>Quality Premium / Deduction:</Text>
            <Text style={[styles.dtValue, { color: '#15803D' }]}>₹0.00 (Standard Grade)</Text>
          </View>

          <View style={[styles.detailRow, styles.finalRow]}>
            <Text style={styles.finalLabel}>Final Approved Amount:</Text>
            <Text style={styles.finalValue}>₹{record.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Action Navigation */}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <TouchableOpacity onPress={() => router.push('/procurement-status')} style={styles.secondaryBtn}>
            <Clock size={20} color="#166534" />
            <Text style={styles.secondaryBtnText}>View Full Timeline</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleProceedToPayment} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Track Payment Transfer</Text>
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
  certCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    elevation: 3,
  },
  certHeader: { flexDirection: 'row', alignItems: 'center' },
  certTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  certSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { color: '#15803D', fontWeight: '800', fontSize: 12 },
  metricsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  metricLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textAlign: 'center', marginTop: 4 },
  detailsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  detailsTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dtLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  dtValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  finalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 6 },
  finalLabel: { fontSize: 15, fontWeight: '900', color: '#166534' },
  finalValue: { fontSize: 20, fontWeight: '900', color: '#166534' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  secondaryBtnText: { color: '#166534', fontWeight: '800', fontSize: 15 },
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
