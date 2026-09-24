import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  Building2, 
  Sparkles, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  X,
  Scale,
  MessageCircle
} from 'lucide-react-native';
import { askHositAI, testHositAI } from '@/lib/hositAI';
import { 
  INITIAL_CENTRES, 
  createBooking, 
  DEFAULT_FARMER,
  getProcurementCentres,
  getActiveBooking
} from '@/lib/procurementService';
import { ProcurementCentre, ProcurementBooking } from '@/lib/types';

export default function ProcurementScreen() {
  const params = useLocalSearchParams<{ centreId?: string }>();
  const [centres, setCentres] = useState<ProcurementCentre[]>(INITIAL_CENTRES);
  const [selectedCrop, setSelectedCrop] = useState('Paddy (A-Grade)');
  const [quantityKg, setQuantityKg] = useState('500');
  const [harvestDate, setHarvestDate] = useState('2026-09-03');
  const [selectedCentre, setSelectedCentre] = useState<ProcurementCentre>(INITIAL_CENTRES[0]);
  const [selectedDate, setSelectedDate] = useState('Today (03 Sep)');
  const [selectedSlot, setSelectedSlot] = useState('10:30 AM - 11:00 AM');
  
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');
  
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [activeBooking, setActiveBooking] = useState<ProcurementBooking | null>(null);

  // Available Crops
  const cropList = [
    'Paddy (A-Grade)',
    'Paddy (Common)',
    'Wheat (Durum)',
    'Maize (Yellow)',
    'Chickpea / Pulses',
    'Groundnut (Kharif)',
  ];

  // Available Time Slots with live availability badges
  const slotOptions = [
    { time: '08:00 AM - 09:00 AM', status: 'AVAILABLE', seatsLeft: 14 },
    { time: '09:30 AM - 10:30 AM', status: 'FEW SLOTS LEFT', seatsLeft: 3 },
    { time: '10:30 AM - 11:30 AM', status: 'AVAILABLE', seatsLeft: 18 },
    { time: '01:00 PM - 02:00 PM', status: 'AVAILABLE', seatsLeft: 22 },
    { time: '02:30 PM - 03:30 PM', status: 'FEW SLOTS LEFT', seatsLeft: 5 },
    { time: '04:00 PM - 05:00 PM', status: 'FULL', seatsLeft: 0 },
  ];

  useEffect(() => {
    async function loadInitialData() {
      setLoadingAi(true);
      try {
        const liveCentres = await getProcurementCentres();
        setCentres(liveCentres);
        if (params.centreId) {
          const match = liveCentres.find(c => c.id === params.centreId);
          if (match) setSelectedCentre(match);
        } else {
          setSelectedCentre(liveCentres[0]);
        }

        const b = await getActiveBooking();
        setActiveBooking(b);
      } catch (e) {
        console.log('[Procurement] Skipped live centres fetch.');
      }

      // Check AI connection
      const testRes = await testHositAI();
      if (testRes.success) {
        setAiStatus('CONNECTED');
      } else {
        setAiStatus('DISCONNECTED');
      }

      // Fetch AI reasoning for smart centre allocation
      const aiPrompt = `Recommend the best procurement centre for farmer ${DEFAULT_FARMER.name} bringing ${quantityKg} kg of ${selectedCrop}. Explain why in 2 simple sentences suitable for a rural farmer.`;
      const context = `Application: Far Reach (SIH26032)
Language: Tamil/English
Farmer: ${DEFAULT_FARMER.name} (ID: ${DEFAULT_FARMER.id})
Centres:
1. Samayapuram Procurement Centre: 43% capacity, 18 min wait, LOW load (Score: 92%)
2. Manachanallur Mandi: 92% capacity, 132 min wait, HIGH load (Score: 43%)
3. Lalgudi Direct Purchase Centre: 71% capacity, 54 min wait, MEDIUM load (Score: 71%)`;

      const aiResponse = await askHositAI({
        message: aiPrompt,
        userId: DEFAULT_FARMER.id,
        context,
      });

      setAiInsight(aiResponse);
      setLoadingAi(false);
    }

    loadInitialData();
  }, [params.centreId]);

  const handleOpenConfirm = () => {
    if (!selectedCrop.trim()) {
      Alert.alert('Validation Error', 'Please select or enter your crop variety.');
      return;
    }
    const qty = parseInt(quantityKg, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid harvest quantity in kg.');
      return;
    }

    const chosenSlotObj = slotOptions.find(s => s.time === selectedSlot);
    if (chosenSlotObj?.status === 'FULL') {
      Alert.alert('Slot Full', 'This time slot is full. Please choose another available slot.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmAndBook = async () => {
    setBookingInProgress(true);
    try {
      const qty = parseInt(quantityKg, 10) || 500;
      const newBooking = await createBooking(selectedCentre, selectedCrop, qty, selectedSlot);
      setActiveBooking(newBooking);
      
      setShowConfirmModal(false);
      Alert.alert(
        "🎉 Slot Booked Successfully!",
        `Far Reach Digital Token #${newBooking.token} generated for ${selectedCentre.name}.\nDate: ${selectedDate}\nSlot: ${selectedSlot}`,
        [
          {
            text: "View Digital Token & Queue",
            onPress: () => router.push('/(tabs)/queue'),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Booking Error", "Unable to complete booking. Please try again.");
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleWhatsAppBooking = async () => {
    if (!selectedCrop.trim()) {
      Alert.alert('Validation Error', 'Please select or enter your crop variety.');
      return;
    }
    const qty = parseInt(quantityKg, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid harvest quantity in kg.');
      return;
    }

    const chosenSlotObj = slotOptions.find(s => s.time === selectedSlot);
    if (chosenSlotObj?.status === 'FULL') {
      Alert.alert('Slot Full', 'This time slot is full. Please choose another available slot.');
      return;
    }

    setBookingInProgress(true);
    try {
      const newBooking = await createBooking(selectedCentre, selectedCrop, qty, selectedSlot);
      setActiveBooking(newBooking);
      setShowConfirmModal(false);

      // Clean contact number for WhatsApp
      let phoneDigits = (selectedCentre.contactNumber || '9876543210').replace(/[^0-9]/g, '');
      if (phoneDigits.length === 10) {
        phoneDigits = '91' + phoneDigits;
      }

      const message = 
        `🌾 *Far Reach - Procurement Slot Booking*\n\n` +
        `📋 *Token:* #${newBooking.token}\n` +
        `🏛️ *Procurement Centre:* ${selectedCentre.name}\n` +
        `📍 *Location:* ${selectedCentre.address}\n` +
        `👨‍🌾 *Farmer:* ${DEFAULT_FARMER.name} (${DEFAULT_FARMER.id})\n` +
        `📞 *Farmer Phone:* ${DEFAULT_FARMER.phone}\n` +
        `🌾 *Crop:* ${selectedCrop}\n` +
        `⚖️ *Quantity:* ${quantityKg} kg\n` +
        `📅 *Date:* ${selectedDate}\n` +
        `⏰ *Time Slot:* ${selectedSlot}\n\n` +
        `_Slot booked and confirmed via Far Reach Smart Mandi Platform._`;

      const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Linking.openURL(`https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(message)}`);
        }
      } catch (e) {
        await Linking.openURL(whatsappUrl);
      }

      Alert.alert(
        "🎉 Slot Booked via WhatsApp!",
        `Far Reach Digital Token #${newBooking.token} booked for ${selectedCentre.name}.\nDate: ${selectedDate}\nSlot: ${selectedSlot}\n\nRedirecting to WhatsApp message to ${selectedCentre.contactNumber}.`,
        [
          {
            text: "View Digital Token & Queue",
            onPress: () => router.push('/(tabs)/queue'),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Booking Error", "Unable to complete WhatsApp booking. Please try again.");
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>FAR REACH</Text>
            <Text style={styles.brandSubtitle}>AI-Powered Smart Procurement Booking</Text>
          </View>

          {/* AI Connection Status Badge */}
          <View style={[styles.aiBadge, aiStatus === 'CONNECTED' ? styles.aiConnected : styles.aiOffline]}>
            <View style={[styles.dot, aiStatus === 'CONNECTED' ? styles.dotGreen : styles.dotYellow]} />
            <Text style={styles.aiBadgeText}>
              {aiStatus === 'CONNECTED' ? 'Hosit AI Active' : 'AI Offline Mode'}
            </Text>
          </View>
        </View>

        {/* Existing Active Booking Banner */}
        {activeBooking && activeBooking.status !== 'PAYMENT_COMPLETED' && (
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/queue')}
            style={styles.activeBookingBanner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.abTitle}>ACTIVE SLOT TOKEN #{activeBooking.token}</Text>
              <Text style={styles.abSub}>{activeBooking.centreName} • {activeBooking.crop}</Text>
            </View>
            <View style={styles.abBtn}>
              <Text style={styles.abBtnText}>View Queue</Text>
              <ChevronRight size={16} color="#166534" />
            </View>
          </TouchableOpacity>
        )}

        {/* Dedicated In-Software Booking Banner */}
        <TouchableOpacity 
          onPress={() => router.push('/book-slot' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#059669',
            padding: 14,
            borderRadius: 14,
            marginBottom: 14,
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Calendar size={22} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}>
                DIRECT IN-APP SLOT BOOKING & PASS
              </Text>
              <Text style={{ fontSize: 11, color: '#DCFCE7', fontWeight: '600', marginTop: 2 }}>
                Instant MSP calculation, vehicle pass & digital token
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>BOOK →</Text>
          </View>
        </TouchableOpacity>

        {/* AI Smart Slot Allocation Banner */}
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerHeader}>
            <Sparkles size={20} color="#166534" />
            <Text style={styles.aiBannerTitle}>FAR REACH AI SLOT ALLOCATION ENGINE</Text>
          </View>
          
          {loadingAi ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#166534" />
              <Text style={styles.loadingText}>Calculating 45% Load + 30% Wait + 15% Distance weights...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.aiReasoningText}>
                {aiInsight || "Samayapuram Procurement Centre scored 92% (LOW load, 43% capacity, ~18 min wait). Recommended for optimal paddy procurement today."}
              </Text>
              <View style={styles.weightBar}>
                <Text style={styles.weightItem}>Load: 45%</Text>

                <Text style={styles.weightItem}>Wait: 30%</Text>
                <Text style={styles.weightItem}>Dist: 15%</Text>
                <Text style={styles.weightItem}>Speed: 10%</Text>
              </View>
            </>
          )}
        </View>

        {/* STEP 1: Crop Declaration */}
        <View style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Scale size={20} color="#166534" />
            <Text style={styles.cardTitle}>1. Crop & Quantity Declaration</Text>
          </View>

          <Text style={styles.label}>Select Commodity Variety</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cropList.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedCrop(c)}
                  style={[styles.cropChip, selectedCrop === c && styles.cropChipActive]}
                >
                  <Text style={[styles.cropChipText, selectedCrop === c && styles.cropChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.inputRow}>
            <View style={styles.inputFlex}>
              <Text style={styles.label}>Estimated Quantity (Kg)</Text>
              <TextInput
                style={styles.input}
                value={quantityKg}
                onChangeText={setQuantityKg}
                keyboardType="numeric"
                placeholder="500"
              />
            </View>
            <View style={styles.inputFlex}>
              <Text style={styles.label}>Harvest Date</Text>
              <TextInput
                style={styles.input}
                value={harvestDate}
                onChangeText={setHarvestDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        </View>

        {/* STEP 2: Procurement Centre Finder & Smart Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Building2 size={20} color="#166534" />
            <Text style={styles.cardTitle}>2. Select Procurement Centre (DPC)</Text>
          </View>
          <Text style={styles.cardSubtitle}>Compare live crowd status, operating hours, and distance</Text>

          {centres.map((centre) => {
            const isSelected = selectedCentre.id === centre.id;
            return (
              <TouchableOpacity
                key={centre.id}
                onPress={() => setSelectedCentre(centre)}
                style={[styles.centreCard, isSelected && styles.selectedCentreCard]}
              >
                <View style={styles.centreHeader}>
                  <Text style={styles.centreName}>{centre.name}</Text>
                  <View style={[
                    styles.statusChip,
                    centre.loadStatus === 'LOW' && styles.chipLow,
                    centre.loadStatus === 'MEDIUM' && styles.chipMedium,
                    centre.loadStatus === 'HIGH' && styles.chipHigh,
                  ]}>
                    <Text style={styles.statusChipText}>{centre.loadStatus} CROWD</Text>
                  </View>
                </View>

                <View style={styles.centreDetailsRow}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#059669" />
                    <Text style={styles.detailText}>{centre.distanceKm} km away</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Users size={14} color="#059669" />
                    <Text style={styles.detailText}>{centre.capacity}% Capacity</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#059669" />
                    <Text style={styles.detailText}>~{centre.averageProcessingMinutes * 6} min wait</Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <CheckCircle2 size={16} color="#166534" />
                    <Text style={styles.selectedText}>SELECTED PROCUREMENT CENTRE</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* STEP 3: Date & Time Slot Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Calendar size={20} color="#166534" />
            <Text style={styles.cardTitle}>3. Select Date & Time Slot</Text>
          </View>
          
          <Text style={styles.label}>Preferred Booking Date</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {['Today (03 Sep)', 'Tomorrow (04 Sep)', 'Day After (05 Sep)'].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedDate(d)}
                style={[styles.dateChip, selectedDate === d && styles.dateChipActive]}
              >
                <Text style={[styles.dateChipText, selectedDate === d && styles.dateChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Available Operational Time Slots</Text>
          <View style={styles.slotsGrid}>
            {slotOptions.map((s) => {
              const isSelected = selectedSlot === s.time;
              const isFull = s.status === 'FULL';
              return (
                <TouchableOpacity
                  key={s.time}
                  onPress={() => !isFull && setSelectedSlot(s.time)}
                  disabled={isFull}
                  style={[
                    styles.slotItem,
                    isSelected && styles.slotItemActive,
                    isFull && styles.slotItemFull,
                  ]}
                >
                  <Text style={[styles.slotText, isSelected && styles.slotTextActive, isFull && styles.slotTextFull]}>
                    {s.time}
                  </Text>
                  <Text style={[styles.slotBadge, isFull ? { color: '#B91C1C' } : { color: '#059669' }]}>
                    {isFull ? 'FULL' : `${s.seatsLeft} slots left`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Book Slot Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              onPress={handleOpenConfirm}
              style={styles.bookButton}
            >
              <Text style={styles.bookButtonText}>CONFIRM & GENERATE DIGITAL TOKEN</Text>
              <ArrowRight size={18} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsAppBooking}
              disabled={bookingInProgress}
              style={styles.whatsappButton}
            >
              <MessageCircle size={18} color="white" />
              <Text style={styles.whatsappButtonText}>BOOK & NOTIFY VIA WHATSAPP</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmation Modal */}
        <Modal visible={showConfirmModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ShieldCheck size={28} color="#166534" />
                <Text style={styles.modalTitle}>Confirm Procurement Booking</Text>
                <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryBox}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Farmer Name:</Text>
                  <Text style={styles.sumVal}>{DEFAULT_FARMER.name} ({DEFAULT_FARMER.id})</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Procurement Centre:</Text>
                  <Text style={styles.sumVal}>{selectedCentre.name}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Declared Crop:</Text>
                  <Text style={styles.sumVal}>{selectedCrop} ({quantityKg} kg)</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Booking Date:</Text>
                  <Text style={styles.sumVal}>{selectedDate}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Time Slot:</Text>
                  <Text style={styles.sumVal}>{selectedSlot}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Estimated Token:</Text>
                  <Text style={[styles.sumVal, { color: '#166534', fontWeight: '900' }]}>#{selectedCentre.booked + 1}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleWhatsAppBooking} 
                  disabled={bookingInProgress}
                  style={styles.whatsappModalBtn}
                >
                  <MessageCircle size={16} color="white" />
                  <Text style={styles.whatsappModalBtnText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleConfirmAndBook} 
                  disabled={bookingInProgress}
                  style={styles.confirmModalBtn}
                >
                  {bookingInProgress ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.confirmModalBtnText}>Confirm Slot</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
    marginBottom: 14,
  },
  brandTitle: { fontSize: 24, fontWeight: '900', color: '#166534', letterSpacing: 1 },
  brandSubtitle: { fontSize: 12, color: '#059669', fontWeight: '600' },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiConnected: { backgroundColor: '#DCFCE7' },
  aiOffline: { backgroundColor: '#FEF3C7' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  dotGreen: { backgroundColor: '#22C55E' },
  dotYellow: { backgroundColor: '#F59E0B' },
  aiBadgeText: { fontSize: 11, fontWeight: '600', color: '#0F172A' },
  activeBookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 14,
  },
  abTitle: { fontSize: 12, fontWeight: '900', color: '#166534', letterSpacing: 0.5 },
  abSub: { fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 },
  abBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  abBtnText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  aiBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 16,
  },
  aiBannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  aiBannerTitle: { fontSize: 12, fontWeight: '800', color: '#166534', marginLeft: 6, letterSpacing: 0.5 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  loadingText: { fontSize: 13, color: '#166534', marginLeft: 8 },
  aiReasoningText: { fontSize: 13, color: '#0B3D2E', lineHeight: 19 },
  weightBar: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#DCFCE7' },
  weightItem: { fontSize: 10, fontWeight: '800', color: '#059669' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardHeaderFlex: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  cropChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cropChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  cropChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  cropChipTextActive: { color: 'white' },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputFlex: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  centreCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCentreCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  centreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  centreName: { fontSize: 15, fontWeight: '800', color: '#0F172A', flex: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipLow: { backgroundColor: '#DCFCE7' },
  chipMedium: { backgroundColor: '#FEF3C7' },
  chipHigh: { backgroundColor: '#FEE2E2' },
  statusChipText: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
  centreDetailsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  selectedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  selectedText: { fontSize: 11, fontWeight: '900', color: '#166534' },
  dateChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dateChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  dateChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  dateChipTextActive: { color: 'white' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  slotItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotItemActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  slotItemFull: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    opacity: 0.7,
  },
  slotText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  slotTextActive: { color: 'white' },
  slotTextFull: { color: '#B91C1C' },
  slotBadge: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  actionButtonsContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
  },
  bookButtonText: { color: 'white', fontWeight: '900', fontSize: 14 },
  whatsappButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
  },
  whatsappButtonText: { color: 'white', fontWeight: '900', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', flex: 1, marginLeft: 8 },
  summaryBox: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sumLbl: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  sumVal: { fontSize: 13, color: '#0F172A', fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  cancelBtnText: { fontWeight: '800', color: '#64748B', fontSize: 13 },
  whatsappModalBtn: {
    flex: 1.3,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  whatsappModalBtnText: { color: 'white', fontWeight: '900', fontSize: 13 },
  confirmModalBtn: { flex: 1.5, backgroundColor: '#166534', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  confirmModalBtnText: { color: 'white', fontWeight: '900', fontSize: 13 },
});
