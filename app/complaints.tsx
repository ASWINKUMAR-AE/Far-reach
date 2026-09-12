import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, MessageSquare, HelpCircle, Phone, CheckCircle2, AlertTriangle } from 'lucide-react-native';

type ComplaintCategory = 'SLOT' | 'WEIGHING' | 'PAYMENT' | 'QUALITY' | 'OTHER';

export default function HelpComplaintsScreen() {
  const [category, setCategory] = useState<ComplaintCategory>('PAYMENT');
  const [message, setMessage] = useState('');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState('');

  const categories: { key: ComplaintCategory; label: string }[] = [
    { key: 'PAYMENT', label: 'Payment Delay' },
    { key: 'WEIGHING', label: 'Weighbridge Difference' },
    { key: 'SLOT', label: 'Slot & Queue Issue' },
    { key: 'QUALITY', label: 'Quality Grading Dispute' },
    { key: 'OTHER', label: 'Other Mandi Issue' },
  ];

  const handleSubmit = () => {
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter your grievance details before submitting.');
      return;
    }
    const newId = `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setComplaintId(newId);
    setComplaintSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Complaints</Text>
        </View>

        {/* Helpline Contact Banner */}
        <View style={styles.banner}>
          <Phone size={24} color="#166534" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Mandi Grievance Helpline</Text>
            <Text style={styles.bannerSub}>Toll Free: 1800-425-1021 (08:00 AM - 08:00 PM)</Text>
          </View>
        </View>

        {/* Submission Confirmation */}
        {complaintSubmitted ? (
          <View style={styles.successCard}>
            <CheckCircle2 size={32} color="#15803D" />
            <Text style={styles.successTitle}>Grievance Registered Successfully!</Text>
            <Text style={styles.successId}>Complaint ID: {complaintId}</Text>
            <Text style={styles.successDesc}>
              Your ticket has been logged with the District Nodal Officer. Expected resolution within 24 hours.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setComplaintSubmitted(false);
                setMessage('');
              }}
              style={styles.newBtn}
            >
              <Text style={styles.newBtnText}>Lodge Another Grievance</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Complaint Form */
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>File Official Procurement Grievance</Text>

            <Text style={styles.label}>Select Category</Text>
            <View style={styles.catGrid}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[styles.catBtn, category === c.key && styles.catBtnActive]}
                >
                  <Text style={[styles.catText, category === c.key && styles.catTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Describe Grievance Details</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              placeholder="Provide details (e.g., payment pending for Token #147, weighing difference, moisture recheck)..."
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
              <MessageSquare size={20} color="white" />
              <Text style={styles.submitBtnText}>Submit Complaint Ticket</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Procurement Assistant Quick Link */}
        <View style={styles.aiCard}>
          <HelpCircle size={24} color="#0284C7" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.aiTitle}>Need Immediate AI Assistance?</Text>
            <Text style={styles.aiSub}>Ask Hosit AI about slot rules, weighing guidelines, or MSP rates.</Text>
            <TouchableOpacity
              onPress={() => router.push('/chat-assistant')}
              style={styles.aiBtn}
            >
              <Text style={styles.aiBtnText}>Open AI Chat Assistant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#166534' },
  bannerSub: { fontSize: 12, color: '#15803D', marginTop: 2, fontWeight: '600' },
  formCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catBtnActive: { backgroundColor: '#166534', borderColor: '#166534' },
  catText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  catTextActive: { color: 'white' },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    height: 110,
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  successCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 10 },
  successId: { fontSize: 16, fontWeight: '800', color: '#166534', marginTop: 4 },
  successDesc: { fontSize: 13, color: '#475569', textAlign: 'center', marginVertical: 12, lineHeight: 18 },
  newBtn: { backgroundColor: '#DCFCE7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  newBtnText: { color: '#166534', fontWeight: '800', fontSize: 14 },
  aiCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  aiTitle: { fontSize: 15, fontWeight: '800', color: '#0284C7' },
  aiSub: { fontSize: 12, color: '#475569', marginTop: 2 },
  aiBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  aiBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
});
