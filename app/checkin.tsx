import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QrCode, CheckCircle2, ArrowLeft, MapPin, Building2, ShieldCheck, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { getActiveBooking, saveActiveBooking, INITIAL_BOOKING } from '@/lib/procurementService';
import { ProcurementBooking } from '@/lib/types';

export default function CheckinScreen() {
  const [booking, setBooking] = useState<ProcurementBooking>(INITIAL_BOOKING);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);

  useEffect(() => {
    async function loadBooking() {
      const active = await getActiveBooking();
      setBooking(active || INITIAL_BOOKING);
      setIsCheckedIn(active?.status === 'CHECKED_IN' || active?.status === 'WEIGHING');
    }
    loadBooking();
  }, []);

  const handleCheckIn = async () => {
    const updated: ProcurementBooking = {
      ...booking,
      status: 'CHECKED_IN',
    };
    await saveActiveBooking(updated);
    setBooking(updated);
    setIsCheckedIn(true);
    Alert.alert(
      "Check-in Successful! 🎉",
      `Arrival verified at ${booking.centreName}.\nToken #${booking.token} is now marked ARRIVED at Counter 2.`,
      [{ text: "Proceed to Live Queue", onPress: () => router.push('/(tabs)/queue') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backBtn}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Centre Self Check-in</Text>
        </View>

        {/* QR Scanner Simulator Card */}
        <View style={styles.card}>
          <View style={styles.qrContainer}>
            <QrCode size={120} color="#166534" />
            <Text style={styles.tokenText}>TOKEN #{booking.token}</Text>
            <Text style={styles.subtext}>Scan QR Code at Centre Gate Entry</Text>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Building2 size={16} color="#059669" />
              <Text style={styles.infoText}>{booking.centreName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={16} color="#059669" />
              <Text style={styles.infoText}>Slot: {booking.slot}</Text>
            </View>
            <View style={styles.infoRow}>
              <ShieldCheck size={16} color="#059669" />
              <Text style={styles.infoText}>Farmer: Ravi (ID: F1021)</Text>
            </View>
          </View>

          {/* Action Button */}
          {isCheckedIn ? (
            <View style={styles.checkedInBadge}>
              <CheckCircle2 size={20} color="#22C55E" />
              <Text style={styles.checkedInText}>CHECK-IN VERIFIED (GATE 2)</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.checkinButton} onPress={handleCheckIn}>
              <Text style={styles.checkinBtnText}>CONFIRM ARRIVAL & CHECK-IN</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF5' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#166534' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 3, alignItems: 'center' },
  qrContainer: { alignItems: 'center', marginVertical: 12 },
  tokenText: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginTop: 12 },
  subtext: { fontSize: 12, color: '#64748B', marginTop: 4 },
  infoBox: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginVertical: 16, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  checkinButton: { width: '100%', backgroundColor: '#166534', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  checkinBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
  checkedInBadge: { width: '100%', backgroundColor: '#DCFCE7', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  checkedInText: { color: '#166534', fontWeight: '800', fontSize: 14 },
});
