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
import { ArrowLeft, CheckCircle2, ChevronRight, Calendar, Scale, DollarSign, FileText } from 'lucide-react-native';
import { getProcurementRecord } from '@/lib/procurementService';
import { ProcurementRecord } from '@/lib/types';

export default function ProcurementHistoryScreen() {
  const [historyList, setHistoryList] = useState<ProcurementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const record = await getProcurementRecord();
        const records: ProcurementRecord[] = [
          record,
          {
            bookingId: 'BK-8210',
            token: 92,
            crop: 'Wheat (Grade A)',
            grossWeightKg: 1040,
            tareWeightKg: 40,
            netWeightKg: 1000,
            ratePerKg: 22.75,
            totalAmount: 22750,
            qualityGrade: 'Grade A',
            moisturePercentage: 11.8,
            procurementStatus: 'ACCEPTED',
            paymentStatus: 'COMPLETED',
            transactionRef: 'TXN-20260412-9912',
            weighingTimestamp: '2026-04-12T11:20:00Z',
          },
          {
            bookingId: 'BK-7104',
            token: 54,
            crop: 'Maize (Yellow)',
            grossWeightKg: 820,
            tareWeightKg: 20,
            netWeightKg: 800,
            ratePerKg: 20.90,
            totalAmount: 16720,
            qualityGrade: 'Grade A',
            moisturePercentage: 13.1,
            procurementStatus: 'ACCEPTED',
            paymentStatus: 'COMPLETED',
            transactionRef: 'TXN-20251105-4410',
            weighingTimestamp: '2025-11-05T09:45:00Z',
          },
        ];
        setHistoryList(records);
      } catch (e) {
        console.warn('Error loading history:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loadingText}>Loading Procurement History...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Procurement History</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={styles.subTitle}>All Completed Procurement Sales ({historyList.length})</Text>

          {historyList.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push('/procurement-status')}
              style={styles.historyCard}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={16} color="#059669" />
                  <Text style={styles.dateText}>
                    {item.weighingTimestamp ? item.weighingTimestamp.split('T')[0] : '2026-09-02'}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <CheckCircle2 size={12} color="#15803D" />
                  <Text style={styles.badgeText}>{item.paymentStatus}</Text>
                </View>
              </View>

              <Text style={styles.cropTitle}>{item.crop}</Text>

              <View style={styles.detailsGrid}>
                <View style={styles.gridItem}>
                  <Scale size={14} color="#64748B" />
                  <Text style={styles.gridVal}>{item.netWeightKg} kg</Text>
                </View>

                <View style={styles.gridItem}>
                  <FileText size={14} color="#64748B" />
                  <Text style={styles.gridVal}>₹{item.ratePerKg}/kg</Text>
                </View>

                <View style={styles.gridItem}>
                  <DollarSign size={14} color="#15803D" />
                  <Text style={styles.amountVal}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.refText}>Ref: {item.transactionRef || 'TXN-8821'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.viewText}>View Record</Text>
                  <ChevronRight size={16} color="#166534" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  subTitle: { fontSize: 14, fontWeight: '800', color: '#64748B', marginBottom: 16 },
  historyCard: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  cropTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  gridItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridVal: { fontSize: 13, color: '#334155', fontWeight: '700' },
  amountVal: { fontSize: 16, fontWeight: '900', color: '#166534' },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  viewText: { fontSize: 13, fontWeight: '800', color: '#166534', marginRight: 2 },
});
