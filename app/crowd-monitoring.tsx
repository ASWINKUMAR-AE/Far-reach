import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Video, Users, AlertCircle } from 'lucide-react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { getActiveBooking } from '@/lib/procurementService';

const CV_API_BASE_URL = process.env.EXPO_PUBLIC_CV_API_URL || 'http://localhost:3000/api/cv';

export default function CrowdMonitoringScreen() {
  const [personCount, setPersonCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  const [cctvUrl, setCctvUrl] = useState<string | null>(null);
  const [cctvLoading, setCctvLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const b = await getActiveBooking();
        setBooking(b);
        if (b && b.centreId) {
          fetchCrowdCount(b.centreId);
        } else {
          // fallback if no active booking is found, normally would pass centreId from params
          fetchCrowdCount('CTR-101');
        }
      } catch (e) {
        console.warn('Failed to init crowd monitoring', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchCrowdCount = async (centreId: string) => {
    try {
      const res = await fetch(`${CV_API_BASE_URL}/crowd-count/${centreId}`);
      const data = await res.json();
      if (data.success) {
        setPersonCount(data.data.person_count);
      }
    } catch (e) {
      console.warn('Failed to fetch crowd count', e);
    }
  };

  const handleRequestCctv = async () => {
    if (cooldownRemaining) return;
    
    setCctvLoading(true);
    try {
      const centreId = booking?.centreId || 'CTR-101';
      const farmerId = 'F1021'; // mock farmer ID

      const res = await fetch(`${CV_API_BASE_URL}/request-cctv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, centreId })
      });

      const data = await res.json();

      if (res.status === 429) {
        setCooldownRemaining(data.remaining_minutes);
        Alert.alert('Cooldown Active', data.error);
      } else if (data.success) {
        setCctvUrl(data.data.stream_url);
        Alert.alert('Success', data.data.message);
      } else {
        Alert.alert('Error', data.error || 'Failed to request CCTV feed');
      }
    } catch (e) {
      console.warn('Failed to request CCTV', e);
      Alert.alert('Error', 'Network error occurred while requesting CCTV feed');
    } finally {
      setCctvLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#166534" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#166534" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Crowd Monitor</Text>
      </View>

      <View style={styles.content}>
        {/* Crowd Count Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={24} color="#059669" />
            <Text style={styles.cardTitle}>Current Procurement Area Crowd</Text>
          </View>
          <Text style={styles.countText}>
            {personCount !== null ? personCount : '--'}
          </Text>
          <Text style={styles.subText}>Persons detected via Smart CV</Text>
        </View>

        {/* CCTV Section */}
        <View style={styles.cctvSection}>
          <Text style={styles.sectionTitle}>Procurement Centre Live Feed</Text>
          <Text style={styles.infoText}>
            For transparency, you can request access to the live CCTV feed for your designated centre. Access is limited to once every 15 minutes.
          </Text>

          {cctvUrl ? (
            <View style={styles.videoContainer}>
              <ExpoVideo
                source={{ uri: cctvUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
              />
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.requestBtn, cooldownRemaining ? styles.disabledBtn : null]} 
              onPress={handleRequestCctv}
              disabled={cctvLoading || !!cooldownRemaining}
            >
              {cctvLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Video size={20} color={cooldownRemaining ? "#94A3B8" : "white"} />
                  <Text style={[styles.requestBtnText, cooldownRemaining ? { color: "#94A3B8"} : null]}>
                    {cooldownRemaining ? `Try again in ${cooldownRemaining}m` : 'Request CCTV Access'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {cooldownRemaining !== null && !cctvUrl && (
            <View style={styles.alertBox}>
              <AlertCircle size={16} color="#B45309" />
              <Text style={styles.alertText}>
                You have recently requested the feed. Please wait {cooldownRemaining} minutes before requesting again to prevent server overload.
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    elevation: 2,
    marginBottom: 24,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  countText: { fontSize: 48, fontWeight: '900', color: '#166534' },
  subText: { fontSize: 13, color: '#64748B', marginTop: 4 },
  cctvSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requestBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  alertText: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18 },
  videoContainer: {
    height: 200,
    backgroundColor: 'black',
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
