import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelpCircle, ArrowLeft, PhoneCall, MessageSquare, ShieldAlert, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

export default function HelpScreen() {
  const faqs = [
    { q: "What documents are required at the Mandi?", a: "Bring your Aadhaar Card, Bank Passbook, Land Pattadar Passbook, and Far Reach Digital Token QR code." },
    { q: "How is payment credited?", a: "Payments are directly credited to your Aadhaar-linked bank account via Direct Benefit Transfer (DBT) within 48-72 hours." },
    { q: "Can I change my booked slot?", a: "Yes, you can use the Smart Centre Reallocation feature in the Live Queue tab to switch to a lower-load centre." },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backBtn}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Grievance Support</Text>
        </View>

        {/* Call Officer Emergency Card */}
        <View style={styles.contactCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Procurement Helpline</Text>
            <Text style={styles.contactSub}>Toll-Free Farmer Support (24x7)</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:18001801551')}>
            <PhoneCall size={18} color="white" />
            <Text style={styles.callBtnText}>1800 180 1551</Text>
          </TouchableOpacity>
        </View>

        {/* AI Procurement Assistant Shortcut */}
        <TouchableOpacity style={styles.aiHelpCard} onPress={() => router.push('/chat-assistant')}>
          <MessageSquare size={24} color="#166534" />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiHelpTitle}>Ask Far Reach AI Advisor</Text>
            <Text style={styles.aiHelpSub}>Get instant answers in Tamil, Hindi & English</Text>
          </View>
          <ChevronRight size={20} color="#166534" />
        </TouchableOpacity>

        {/* Lodge Complaint Shortcut */}
        <TouchableOpacity style={[styles.aiHelpCard, { borderColor: '#FCA5A5' }]} onPress={() => router.push('/complaints')}>
          <ShieldAlert size={24} color="#B91C1C" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.aiHelpTitle, { color: '#B91C1C' }]}>Lodge Official Grievance</Text>
            <Text style={styles.aiHelpSub}>File ticket for payment, weighing, or slot issues</Text>
          </View>
          <ChevronRight size={20} color="#B91C1C" />
        </TouchableOpacity>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((item, idx) => (
            <View key={idx} style={styles.faqCard}>
              <Text style={styles.faqQ}>Q: {item.q}</Text>
              <Text style={styles.faqA}>{item.a}</Text>
            </View>
          ))}
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
  contactCard: { backgroundColor: '#0B3D2E', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  contactTitle: { fontSize: 16, fontWeight: '800', color: 'white' },
  contactSub: { fontSize: 11, color: '#86EFAC', marginTop: 2 },
  callBtn: { backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  callBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
  aiHelpCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#86EFAC', marginBottom: 16 },
  aiHelpTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  aiHelpSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  faqCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  faqQ: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 4 },
  faqA: { fontSize: 13, color: '#334155', lineHeight: 18 },
});
