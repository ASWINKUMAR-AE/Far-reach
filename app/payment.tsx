import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { getActiveBooking } from '@/lib/procurementService';

const PAYMENT_API_BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_URL || 'http://localhost:3000/api/payment';

export default function SecurePaymentScreen() {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const b = await getActiveBooking();
        setBooking(b);
      } catch (e) {
        console.warn('Failed to load booking for payment', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleInitPayment = async () => {
    if (!booking?.ticketId) return;
    setInitLoading(true);
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: booking.ticketId })
      });
      const data = await res.json();
      
      if (data.success) {
        setOrderId(data.data.order_id);
        setAmount(data.data.amount);
      } else {
        Alert.alert('Error', data.error || 'Failed to initialize payment');
      }
    } catch (e) {
      console.warn('Init payment error', e);
      Alert.alert('Error', 'Network error');
    } finally {
      setInitLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: booking?.ticketId,
          orderId: orderId,
          mockSignature: 'mock_valid_signature'
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setPaymentSuccess(true);
      } else {
        Alert.alert('Payment Failed', data.error || 'Signature verification failed');
      }
    } catch (e) {
      console.warn('Verify payment error', e);
      Alert.alert('Error', 'Network error');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#166534" />
      </SafeAreaView>
    );
  }

  if (paymentSuccess) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <CheckCircle2 size={64} color="#059669" />
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSub}>Amount ₹{amount} has been securely verified.</Text>
        <Text style={styles.successRef}>Ref: {orderId}</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/')}>
          <Text style={styles.homeBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#166534" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment Gateway</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.secureHeader}>
          <ShieldCheck size={20} color="#16a34a" />
          <Text style={styles.secureText}>256-bit Secure Encrypted Connection</Text>
        </View>

        {!orderId ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Procurement Checkout</Text>
            <Text style={styles.label}>Ticket No: {booking?.token}</Text>
            
            <TouchableOpacity 
              style={styles.payBtn} 
              onPress={handleInitPayment}
              disabled={initLoading}
            >
              {initLoading ? <ActivityIndicator color="white" /> : (
                <>
                  <CreditCard color="white" size={20} />
                  <Text style={styles.payBtnText}>Initialize Secure Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
             <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.summaryValue}>{orderId}</Text>
             </View>
             <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={[styles.summaryValue, styles.amountValue]}>₹{amount}</Text>
             </View>

             <View style={styles.mockForm}>
                <Text style={styles.mockLabel}>Simulate Payment Action</Text>
                <Text style={styles.mockSubLabel}>This acts as a mockup of a generic bank/UPI gateway overlay.</Text>
                
                <TouchableOpacity 
                  style={[styles.payBtn, { marginTop: 20 }]} 
                  onPress={handleVerifyPayment}
                  disabled={verifying}
                >
                  {verifying ? <ActivityIndicator color="white" /> : (
                    <Text style={styles.payBtnText}>Pay & Verify ₹{amount}</Text>
                  )}
                </TouchableOpacity>
             </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20 },
  secureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
  },
  secureText: { color: '#166534', fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  label: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  orderSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 15, color: '#64748B' },
  summaryValue: { fontSize: 15, color: '#0F172A', fontWeight: '700' },
  amountValue: { fontSize: 20, color: '#059669', fontWeight: '900' },
  mockForm: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  mockLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  mockSubLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#059669', marginTop: 16 },
  successSub: { fontSize: 15, color: '#475569', textAlign: 'center', marginTop: 8 },
  successRef: { fontSize: 13, color: '#94A3B8', marginTop: 16 },
  homeBtn: {
    backgroundColor: '#166534',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
  },
  homeBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
});
