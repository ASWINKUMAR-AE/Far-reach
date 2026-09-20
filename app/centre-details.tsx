import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Layers,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Navigation,
  Camera,
} from 'lucide-react-native';
import { getProcurementCentres, INITIAL_CENTRES } from '@/lib/procurementService';
import { ProcurementCentre } from '@/lib/types';

export default function CentreDetailsScreen() {
  const params = useLocalSearchParams<{ centreId?: string }>();
  const [centre, setCentre] = useState<ProcurementCentre | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const centres = await getProcurementCentres();
        const found = centres.find((c) => c.id === params.centreId) || centres[0] || INITIAL_CENTRES[0];
        setCentre(found);
      } catch (e) {
        setCentre(INITIAL_CENTRES[0]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.centreId]);

  if (loading || !centre) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loadingText}>Loading Procurement Centre Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getLoadBadge = (status: string) => {
    switch (status) {
      case 'LOW':
        return { label: 'LOW CROWD (43% Load)', bg: '#DCFCE7', text: '#15803D' };
      case 'HIGH':
        return { label: 'HIGH CONGESTION (92% Load)', bg: '#FEE2E2', text: '#B91C1C' };
      default:
        return { label: 'MODERATE QUEUE (71% Load)', bg: '#FEF3C7', text: '#B45309' };
    }
  };

  const badge = getLoadBadge(centre.loadStatus);

  const openDirections = () => {
    const query = encodeURIComponent(`${centre.name}, ${centre.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const callCentre = () => {
    Linking.openURL(`tel:${centre.contactNumber}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Centre Details</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.centreName}>{centre.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
            <MapPin size={16} color="#059669" />
            <Text style={styles.addressText}>{centre.address}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Quick Operational Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{centre.distanceKm} km</Text>
            <Text style={styles.metricLbl}>Distance</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>#{centre.currentToken}</Text>
            <Text style={styles.metricLbl}>Now Serving</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{centre.averageProcessingMinutes} min</Text>
            <Text style={styles.metricLbl}>Avg Speed</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{centre.countersCount}</Text>
            <Text style={styles.metricLbl}>Counters</Text>
          </View>
        </View>

        {/* Operational Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Operational Information</Text>

          <View style={styles.infoLine}>
            <Clock size={18} color="#166534" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Operating Hours</Text>
              <Text style={styles.infoDesc}>{centre.operatingHours}</Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <Users size={18} color="#166534" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Queue Capacity & Bookings</Text>
              <Text style={styles.infoDesc}>{centre.booked} Farmers Booked Today ({centre.capacity}% Capacity)</Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <Layers size={18} color="#166534" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Accepted Crops</Text>
              <Text style={styles.infoDesc}>Paddy (A & Common Grade), Wheat, Maize, Pulses</Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <Phone size={18} color="#166534" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Helpline & Support</Text>
              <Text style={styles.infoDesc}>{centre.contactNumber}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 12 }}>
          <TouchableOpacity onPress={openDirections} style={styles.primaryBtn}>
            <Navigation size={20} color="white" />
            <Text style={styles.primaryBtnText}>Get Directions on Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={callCentre} style={styles.secondaryBtn}>
            <Phone size={20} color="#166534" />
            <Text style={styles.secondaryBtnText}>Call Mandi Helpline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/cctv-monitor?centreId=${centre.id}&centreName=${encodeURIComponent(centre.name)}`)}
            style={styles.cctvBtn}
          >
            <Camera size={20} color="white" />
            <Text style={styles.cctvBtnText}>Watch Live CCTV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/procurement?centreId=${centre.id}`)}
            style={styles.bookBtn}
          >
            <Calendar size={20} color="white" />
            <Text style={styles.bookBtnText}>Book Slot at This Centre</Text>
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
  heroCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    elevation: 3,
  },
  centreName: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  addressText: { fontSize: 13, color: '#475569', marginLeft: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    marginHorizontal: 3,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricVal: { fontSize: 15, fontWeight: '900', color: '#166534' },
  metricLbl: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 2 },
  sectionCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  infoLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  infoDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryBtnText: { color: '#166534', fontWeight: '800', fontSize: 15 },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  cctvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cctvBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 15 },
});
