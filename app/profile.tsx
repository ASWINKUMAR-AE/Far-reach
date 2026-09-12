import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, ShieldCheck, CreditCard, Building2, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { DEFAULT_FARMER, INITIAL_BOOKING, INITIAL_RECORD } from '@/lib/procurementService';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backBtn}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farmer Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <User size={36} color="white" />
          </View>
          <Text style={styles.farmerName}>{DEFAULT_FARMER.name}</Text>
          <Text style={styles.farmerId}>FAR REACH ID: {DEFAULT_FARMER.id}</Text>
          <Text style={styles.phoneText}>{DEFAULT_FARMER.phone} • {DEFAULT_FARMER.district}</Text>

          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color="#166534" />
            <Text style={styles.verifiedText}>Aadhaar Verified Farmer</Text>
          </View>
        </View>

        {/* Direct Benefit Transfer (DBT) Bank Account */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={20} color="#166534" />
            <Text style={styles.cardTitle}>DBT Payment Account</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bank Account:</Text>
            <Text style={styles.infoValue}>{DEFAULT_FARMER.bankAccount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IFSC Code:</Text>
            <Text style={styles.infoValue}>{DEFAULT_FARMER.bankIfsc}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>UPI VPA:</Text>
            <Text style={styles.infoValue}>{DEFAULT_FARMER.upiId}</Text>
          </View>
        </View>

        {/* Recent Procurement History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building2 size={20} color="#166534" />
            <Text style={styles.cardTitle}>Procurement History</Text>
          </View>
          <View style={styles.historyItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>{INITIAL_BOOKING.crop}</Text>
              <Text style={styles.historySub}>{INITIAL_BOOKING.centreName} • {INITIAL_BOOKING.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.historyAmount}>₹{INITIAL_RECORD.totalAmount}</Text>
              <Text style={styles.historyStatus}>{INITIAL_RECORD.paymentStatus}</Text>
            </View>
          </View>
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
  profileCard: {
    backgroundColor: '#0B3D2E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  farmerName: { fontSize: 22, fontWeight: '900', color: 'white' },
  farmerId: { fontSize: 12, fontWeight: '800', color: '#86EFAC', marginVertical: 2 },
  phoneText: { fontSize: 13, color: '#A7F3D0' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  historySub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '900', color: '#166534' },
  historyStatus: { fontSize: 10, fontWeight: '700', color: '#D97706' },
});