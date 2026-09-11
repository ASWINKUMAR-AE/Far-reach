import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Scale, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react-native';
import { getActiveBooking, getProcurementRecord, calculateWeighing } from '@/lib/procurementService';
import { ProcurementBooking, ProcurementRecord } from '@/lib/types';

export default function WeighingDetailsScreen() {
  const [booking, setBooking] = useState<ProcurementBooking | null>(null);
  const [record, setRecord] = useState<ProcurementRecord | null>(null);
  const [grossInput, setGrossInput] = useState('520');
  const [tareInput, setTareInput] = useState('20');
  const [rateInput, setRateInput] = useState('23.50');
  const [calculatedNet, setCalculatedNet] = useState(500);
  const [calculatedTotal, setCalculatedTotal] = useState(11750);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const b = await getActiveBooking();
        const r = await getProcurementRecord();
        setBooking(b);
        setRecord(r);
        if (r) {
          setGrossInput(r.grossWeightKg.toString());
          setTareInput(r.tareWeightKg.toString());
          setRateInput(r.ratePerKg.toString());
          setCalculatedNet(r.netWeightKg);
          setCalculatedTotal(r.totalAmount);
        }
      } catch (e) {
        console.warn('Error loading weighing screen:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCalculate = (grossStr: string, tareStr: string, rateStr: string) => {
    setGrossInput(grossStr);
    setTareInput(tareStr);
    setRateInput(rateStr);
    setErrorMessage(null);

    const gross = parseFloat(grossStr) || 0;
    const tare = parseFloat(tareStr) || 0;
    const rate = parseFloat(rateStr) || 0;

    try {
      const result = calculateWeighing(gross, tare, rate);
      setCalculatedNet(result.netWeightKg);
      setCalculatedTotal(result.totalAmount);
    } catch (e: any) {
      setErrorMessage(e.message || 'Invalid weighbridge entry.');
    }
  };

  const handleConfirmWeighing = () => {
    if (errorMessage) {
      Alert.alert('Validation Error', errorMessage);
      return;
    }
    Alert.alert(
      'Weighing Confirmed',
      `Net Weight: ${calculatedNet} kg\nTotal Amount: ₹${calculatedTotal.toLocaleString('en-IN')}\n\nProceeding to Quality Inspection.`,
      [{ text: 'OK', onPress: () => router.push('/quality-check') }]
    );
  };

  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loadingText}>Connecting Digital Weighbridge...</Text>
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
          <Text style={styles.headerTitle}>Transparent Weighing</Text>
        </View>

        {/* Token & Crop Context */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>DIGITAL TOKEN</Text>
              <Text style={styles.tokenText}>#{booking.token}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardLabel}>CROP VARIETY</Text>
              <Text style={styles.cropText}>{booking.crop}</Text>
            </View>
          </View>
          <Text style={styles.centreSub}>{booking.centreName}</Text>
        </View>

        {/* Digital Weighbridge Form */}
        <View style={styles.formCard}>
          <View style={styles.formTitleRow}>
            <Scale size={20} color="#166534" />
            <Text style={styles.formTitle}>Digital Weighbridge Scale Input</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gross Weight (Vehicle + Crop) [kg]</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={grossInput}
              onChangeText={(val) => handleCalculate(val, tareInput, rateInput)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tare Weight (Empty Gunny/Vehicle) [kg]</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tareInput}
              onChangeText={(val) => handleCalculate(grossInput, val, rateInput)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Govt MSP Rate (₹/kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={rateInput}
              onChangeText={(val) => handleCalculate(grossInput, tareInput, val)}
            />
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Breakdown Output */}
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.bdLabel}>Calculated Net Weight:</Text>
              <Text style={styles.bdValue}>{calculatedNet} kg</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.bdLabel}>Govt MSP Rate:</Text>
              <Text style={styles.bdValue}>₹{rateInput}/kg</Text>
            </View>

            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Procurement Value:</Text>
              <Text style={styles.totalValue}>₹{calculatedTotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleConfirmWeighing} style={styles.confirmBtn}>
            <CheckCircle2 size={20} color="white" />
            <Text style={styles.confirmBtnText}>Confirm Weighing Record</Text>
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
  card: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  tokenText: { fontSize: 24, fontWeight: '900', color: '#166534' },
  cropText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  centreSub: { fontSize: 12, color: '#64748B', marginTop: 8 },
  formCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', flex: 1 },
  breakdownCard: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 16,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bdLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  bdValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#86EFAC', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: '900', color: '#166534' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#166534' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
});
