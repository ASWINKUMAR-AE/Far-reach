import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Scale, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  ShieldCheck, 
  Download,
  AlertCircle
} from 'lucide-react-native';
import { getProcurementRecord } from '@/lib/procurementService';
import { ProcurementRecord } from '@/lib/types';

export default function PaymentsScreen() {
  const [record, setRecord] = useState<ProcurementRecord | null>(null);

  useEffect(() => {
    async function loadRecord() {
      const data = await getProcurementRecord();
      setRecord(data);
    }
    loadRecord();
  }, []);

  const handleShareReceipt = async () => {
    if (!record) return;
    try {
      await Share.share({
        message: `Far Reach Transparent Weighing Receipt\nToken #${record.token}\nNet Weight: ${record.netWeightKg} kg\nRate: ₹${record.ratePerKg}/kg\nTotal Amount: ₹${record.totalAmount}\nStatus: Payment ${record.paymentStatus}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>FAR REACH PAYMENTS</Text>
            <Text style={styles.brandSubtitle}>Transparent Weighing & Instant Direct Settlement</Text>
          </View>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO MODE</Text>
          </View>
        </View>

        {/* Total Amount Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>PROCUREMENT AMOUNT DUE</Text>
          <View style={styles.amountRow}>
            <IndianRupee size={32} color="white" />
            <Text style={styles.amountText}>{record?.totalAmount.toLocaleString('en-IN') || '11,750'}</Text>
          </View>
          <Text style={styles.heroSubtext}>Crop: {record?.crop || 'Paddy (A-Grade)'}</Text>
          
          <View style={styles.txStatusBox}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.txStatusText}>Status: Payment Processing via Direct Bank Transfer (DBT)</Text>
          </View>
        </View>

        {/* Transparent Weighing Breakdown Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Scale size={20} color="#166534" />
            <Text style={styles.cardTitle}>Transparent Weighing Breakdown</Text>
          </View>
          <Text style={styles.cardSub}>Digital weighbridge calculations (Net = Gross - Tare)</Text>

          <View style={styles.weighingGrid}>
            <View style={styles.weighingItem}>
              <Text style={styles.weighingLabel}>GROSS WEIGHT</Text>
              <Text style={styles.weighingValue}>{record?.grossWeightKg || 520} kg</Text>
            </View>

            <View style={styles.weighingItem}>
              <Text style={styles.weighingLabel}>TARE WEIGHT</Text>
              <Text style={styles.weighingValue}>{record?.tareWeightKg || 20} kg</Text>
            </View>

            <View style={[styles.weighingItem, styles.highlightNet]}>
              <Text style={styles.weighingLabelNet}>NET WEIGHT</Text>
              <Text style={styles.weighingValueNet}>{record?.netWeightKg || 500} kg</Text>
            </View>

            <View style={styles.weighingItem}>
              <Text style={styles.weighingLabel}>GOVT MSP RATE</Text>
              <Text style={styles.weighingValue}>₹{record?.ratePerKg || 23.50}/kg</Text>
            </View>
          </View>

          {/* Quality & Moisture */}
          <View style={styles.qualityRow}>
            <View style={styles.qualityBadge}>
              <Text style={styles.qualityText}>Quality: {record?.qualityGrade || 'Grade A'}</Text>
            </View>
            <View style={styles.qualityBadge}>
              <Text style={styles.qualityText}>Moisture: {record?.moisturePercentage || 12.4}%</Text>
            </View>
          </View>
        </View>

        {/* Payment Tracking Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Receipt size={20} color="#166534" />
            <Text style={styles.cardTitle}>Payment Status Tracking</Text>
          </View>

          <View style={styles.payTimeline}>
            <View style={styles.payStep}>
              <CheckCircle2 size={18} color="#22C55E" />
              <View style={styles.payStepText}>
                <Text style={styles.payStepTitle}>Procurement Accepted</Text>
                <Text style={styles.payStepSub}>Verified at Samayapuram Centre</Text>
              </View>
            </View>

            <View style={styles.payStep}>
              <CheckCircle2 size={18} color="#22C55E" />
              <View style={styles.payStepText}>
                <Text style={styles.payStepTitle}>Payment Initiated</Text>
                <Text style={styles.payStepSub}>Ref: {record?.transactionRef || 'TXN-20260902-8821'}</Text>
              </View>
            </View>

            <View style={styles.payStep}>
              <Clock size={18} color="#F59E0B" />
              <View style={styles.payStepText}>
                <Text style={styles.payStepTitle}>Payment Processing 🟡</Text>
                <Text style={styles.payStepSub}>Clearing with Treasury Bank</Text>
              </View>
            </View>

            <View style={[styles.payStep, { opacity: 0.5 }]}>
              <Clock size={18} color="#94A3B8" />
              <View style={styles.payStepText}>
                <Text style={styles.payStepTitle}>Payment Received ⏳</Text>
                <Text style={styles.payStepSub}>Credited to Bank Account</Text>
              </View>
            </View>
          </View>

          {/* Download / Share Receipt */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShareReceipt}>
            <Download size={16} color="white" />
            <Text style={styles.shareText}>SHARE RECEIPT SUMMARY</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  brandTitle: { fontSize: 20, fontWeight: '900', color: '#166534' },
  brandSubtitle: { fontSize: 11, color: '#059669', fontWeight: '600' },
  demoBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  demoBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  heroCard: {
    backgroundColor: '#0B3D2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 3,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: '#86EFAC', letterSpacing: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  amountText: { fontSize: 40, fontWeight: '900', color: 'white', marginLeft: 4 },
  heroSubtext: { fontSize: 13, color: '#A7F3D0' },
  txStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 14,
  },
  txStatusText: { fontSize: 11, color: '#FCD34D', fontWeight: '600' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 12 },
  weighingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  weighingItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightNet: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  weighingLabel: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  weighingLabelNet: { fontSize: 10, fontWeight: '800', color: '#166534' },
  weighingValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  weighingValueNet: { fontSize: 18, fontWeight: '900', color: '#166534', marginTop: 4 },
  qualityRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  qualityBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  qualityText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  payTimeline: { gap: 14, marginVertical: 8 },
  payStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  payStepText: { flex: 1 },
  payStepTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  payStepSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  shareButton: {
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  shareText: { color: 'white', fontWeight: '800', fontSize: 12 },
});
