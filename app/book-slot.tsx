import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Truck,
  Sparkles,
  QrCode,
  ArrowRight,
  ChevronRight,
  X,
  AlertTriangle,
  CreditCard,
  Video,
} from 'lucide-react-native';
import {
  INITIAL_CENTRES,
  createBooking,
  DEFAULT_FARMER,
  getProcurementCentres,
  getActiveBooking,
} from '@/lib/procurementService';
import { ProcurementCentre, ProcurementBooking } from '@/lib/types';
import { askHositAI } from '@/lib/hositAI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CROPS_DATA = [
  { name: 'Paddy (A-Grade)', mspRate: 23.50, icon: '🌾', category: 'Kharif' },
  { name: 'Paddy (Common)', mspRate: 22.00, icon: '🌾', category: 'Kharif' },
  { name: 'Wheat (Durum)', mspRate: 24.25, icon: '🌱', category: 'Rabi' },
  { name: 'Maize (Yellow)', mspRate: 20.90, icon: '🌽', category: 'Kharif' },
  { name: 'Chickpea / Pulses', mspRate: 54.40, icon: '🧆', category: 'Rabi' },
  { name: 'Groundnut (Pod)', mspRate: 67.80, icon: '🥜', category: 'Kharif' },
  { name: 'Sugarcane', mspRate: 3.15, icon: '🎋', category: 'Annual' },
];

const TIME_SLOTS = [
  { time: '08:00 AM - 09:00 AM', status: 'AVAILABLE', seatsLeft: 14 },
  { time: '09:30 AM - 10:30 AM', status: 'FEW SLOTS LEFT', seatsLeft: 3 },
  { time: '10:30 AM - 11:30 AM', status: 'AVAILABLE', seatsLeft: 18 },
  { time: '01:00 PM - 02:00 PM', status: 'AVAILABLE', seatsLeft: 22 },
  { time: '02:30 PM - 03:30 PM', status: 'FEW SLOTS LEFT', seatsLeft: 5 },
  { time: '04:00 PM - 05:00 PM', status: 'FULL', seatsLeft: 0 },
];

const VEHICLE_OPTIONS = [
  { id: 'tractor', label: 'Tractor Trolley', icon: '🚜' },
  { id: 'mini_truck', label: 'Mini Truck / 407', icon: '🚚' },
  { id: 'pickup', label: 'Pickup / Bolero', icon: '🛻' },
  { id: 'cart', label: 'Bullock Cart / Van', icon: '🐂' },
];

export default function BookSlotScreen() {
  const params = useLocalSearchParams<{ centreId?: string }>();
  const [centres, setCentres] = useState<ProcurementCentre[]>(INITIAL_CENTRES);
  const [selectedCrop, setSelectedCrop] = useState(CROPS_DATA[0].name);
  const [quantityKg, setQuantityKg] = useState('500');
  const [selectedCentre, setSelectedCentre] = useState<ProcurementCentre>(INITIAL_CENTRES[0]);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0].time);
  const [selectedVehicle, setSelectedVehicle] = useState('tractor');
  const [moistureDeclared, setMoistureDeclared] = useState('12.5%');

  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookedPass, setBookedPass] = useState<ProcurementBooking | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);

  // Load centres
  useEffect(() => {
    async function loadCentres() {
      try {
        const live = await getProcurementCentres();
        if (live && live.length > 0) {
          setCentres(live);
          if (params.centreId) {
            const matched = live.find((c) => c.id === params.centreId);
            if (matched) setSelectedCentre(matched);
          } else {
            setSelectedCentre(live[0]);
          }
        }
      } catch (e) {
        console.log('[BookSlot] Using fallback centres');
      }
    }
    loadCentres();
  }, [params.centreId]);

  // Current crop object and live MSP calculation
  const currentCropObj = CROPS_DATA.find((c) => c.name === selectedCrop) || CROPS_DATA[0];
  const parsedQty = parseInt(quantityKg, 10) || 0;
  const estimatedRevenue = (parsedQty * currentCropObj.mspRate).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  const handleBookingSubmit = async () => {
    if (!parsedQty || parsedQty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid harvest quantity in kg.');
      return;
    }

    const slotObj = TIME_SLOTS.find((s) => s.time === selectedSlot);
    if (slotObj?.status === 'FULL') {
      Alert.alert('Slot Full', 'The selected time slot is full. Please choose another slot.');
      return;
    }

    setBookingInProgress(true);
    try {
      const newBooking = await createBooking(
        selectedCentre,
        selectedCrop,
        parsedQty,
        selectedSlot
      );

      setBookedPass(newBooking);
      setShowPassModal(true);
    } catch (e: any) {
      Alert.alert('Booking Error', 'Could not complete booking. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#166534" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book Procurement Slot</Text>
          <Text style={styles.headerSubtitle}>Direct In-Software Scheduling & Digital Token</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.onlineText}>Live Mandi</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: CROP & HARVEST QUANTITY */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Crop & Quantity Declaration</Text>
              <Text style={styles.stepSub}>Select crop variety and estimated harvest weight</Text>
            </View>
          </View>

          {/* Crop Variety Chips */}
          <Text style={styles.fieldLabel}>Select Crop Variety</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CROPS_DATA.map((crop) => {
                const isSelected = selectedCrop === crop.name;
                return (
                  <TouchableOpacity
                    key={crop.name}
                    onPress={() => setSelectedCrop(crop.name)}
                    style={[styles.cropChip, isSelected && styles.cropChipSelected]}
                  >
                    <Text style={{ fontSize: 14 }}>{crop.icon}</Text>
                    <Text style={[styles.cropChipText, isSelected && styles.cropChipTextSelected]}>
                      {crop.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Quantity Input & Preset Buttons */}
          <Text style={styles.fieldLabel}>Estimated Quantity to Deliver (Kg)</Text>
          <View style={styles.qtyInputRow}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={quantityKg}
                onChangeText={setQuantityKg}
                placeholder="500"
              />
              <Text style={styles.inputUnit}>KG</Text>
            </View>
            <View style={styles.presetsRow}>
              {[500, 1000, 2000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setQuantityKg(preset.toString())}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetBtnText}>{preset} kg</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Live MSP Calculation Banner */}
          <View style={styles.mspBanner}>
            <View style={styles.mspLeft}>
              <Text style={styles.mspTag}>GOVT MSP RATE</Text>
              <Text style={styles.mspRate}>₹{currentCropObj.mspRate.toFixed(2)} / kg</Text>
            </View>
            <View style={styles.mspDivider} />
            <View style={styles.mspRight}>
              <Text style={styles.mspTag}>ESTIMATED REVENUE</Text>
              <Text style={styles.mspTotal}>₹{estimatedRevenue}</Text>
            </View>
          </View>
        </View>

        {/* STEP 2: PROCUREMENT CENTRE SELECTION */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Select Procurement Centre (DPC)</Text>
              <Text style={styles.stepSub}>Choose nearest centre with lowest crowd wait time</Text>
            </View>
          </View>

          {centres.map((centre) => {
            const isSelected = selectedCentre.id === centre.id;
            return (
              <TouchableOpacity
                key={centre.id}
                onPress={() => setSelectedCentre(centre)}
                style={[styles.centreCard, isSelected && styles.centreCardSelected]}
              >
                <View style={styles.centreTopRow}>
                  <Text style={styles.centreName}>{centre.name}</Text>
                  <View
                    style={[
                      styles.loadChip,
                      centre.loadStatus === 'LOW'
                        ? styles.loadChipLow
                        : centre.loadStatus === 'MEDIUM'
                        ? styles.loadChipMed
                        : styles.loadChipHigh,
                    ]}
                  >
                    <Text style={styles.loadChipText}>{centre.loadStatus} CROWD</Text>
                  </View>
                </View>

                <View style={styles.centreMetricsRow}>
                  <View style={styles.metricItem}>
                    <MapPin size={13} color="#059669" />
                    <Text style={styles.metricText}>{centre.distanceKm} km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Clock size={13} color="#059669" />
                    <Text style={styles.metricText}>~{centre.averageProcessingMinutes * 6} min wait</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Users size={13} color="#059669" />
                    <Text style={styles.metricText}>{centre.capacity}% load</Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.centreSelectedFooter}>
                    <CheckCircle2 size={15} color="#166534" />
                    <Text style={styles.centreSelectedText}>Selected for Slot Booking</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* STEP 3: DATE & TIME SLOT SELECTION */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Operational Date & Slot</Text>
              <Text style={styles.stepSub}>Select arrival time window at weighbridge</Text>
            </View>
          </View>

          {/* Date Selector */}
          <Text style={styles.fieldLabel}>Booking Date</Text>
          <View style={styles.dateSelectorRow}>
            {['Today', 'Tomorrow', 'Day After'].map((d) => {
              const isSelected = selectedDate === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDate(d)}
                  style={[styles.dateBtn, isSelected && styles.dateBtnSelected]}
                >
                  <Calendar size={14} color={isSelected ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.dateBtnText, isSelected && styles.dateBtnTextSelected]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Slots Grid */}
          <Text style={styles.fieldLabel}>Available Operational Slots</Text>
          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map((s) => {
              const isSelected = selectedSlot === s.time;
              const isFull = s.status === 'FULL';
              return (
                <TouchableOpacity
                  key={s.time}
                  disabled={isFull}
                  onPress={() => setSelectedSlot(s.time)}
                  style={[
                    styles.slotItem,
                    isSelected && styles.slotItemSelected,
                    isFull && styles.slotItemFull,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotItemText,
                      isSelected && styles.slotItemTextSelected,
                      isFull && styles.slotItemTextFull,
                    ]}
                  >
                    {s.time}
                  </Text>
                  <Text
                    style={[
                      styles.slotSeatsText,
                      isFull ? { color: '#DC2626' } : { color: '#059669' },
                    ]}
                  >
                    {isFull ? 'Full' : `${s.seatsLeft} available`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* STEP 4: TRANSPORT VEHICLE & FARMER INFO */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Transport & Farmer Verification</Text>
              <Text style={styles.stepSub}>Select transport vehicle for smooth weighbridge entry</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Transport Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            {VEHICLE_OPTIONS.map((veh) => {
              const isSelected = selectedVehicle === veh.id;
              return (
                <TouchableOpacity
                  key={veh.id}
                  onPress={() => setSelectedVehicle(veh.id)}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>{veh.icon}</Text>
                  <Text style={[styles.vehicleText, isSelected && styles.vehicleTextSelected]}>
                    {veh.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Farmer Details Box */}
          <View style={styles.farmerBox}>
            <View style={styles.farmerBoxRow}>
              <Text style={styles.fbLabel}>Farmer Name:</Text>
              <Text style={styles.fbVal}>{DEFAULT_FARMER.name}</Text>
            </View>
            <View style={styles.farmerBoxRow}>
              <Text style={styles.fbLabel}>Farmer ID:</Text>
              <Text style={styles.fbVal}>{DEFAULT_FARMER.id}</Text>
            </View>
            <View style={styles.farmerBoxRow}>
              <Text style={styles.fbLabel}>District Mandi:</Text>
              <Text style={styles.fbVal}>{DEFAULT_FARMER.district}</Text>
            </View>
            <View style={styles.farmerBoxRow}>
              <Text style={styles.fbLabel}>Direct Bank UPI:</Text>
              <Text style={styles.fbVal}>{DEFAULT_FARMER.upiId}</Text>
            </View>
          </View>
        </View>

        {/* SUBMIT BOOKING BUTTON */}
        <TouchableOpacity
          style={styles.bookActionBtn}
          onPress={handleBookingSubmit}
          disabled={bookingInProgress}
          activeOpacity={0.85}
        >
          {bookingInProgress ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.bookActionBtnText}>CONFIRM & GENERATE DIGITAL TOKEN</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* DIGITAL PROCUREMENT TOKEN PASS MODAL */}
      <Modal visible={showPassModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.passHeader}>
              <View style={styles.passHeaderIcon}>
                <CheckCircle2 size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passTitle}>FAR REACH DIGITAL PASS</Text>
                <Text style={styles.passSubtitle}>Official Procurement Entry Token</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPassModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Token Badge */}
            <View style={styles.tokenHighlightBox}>
              <Text style={styles.tokenLabel}>ASSIGNED DIGITAL TOKEN</Text>
              <Text style={styles.tokenNumber}>#{bookedPass?.token || 148}</Text>
              <Text style={styles.tokenMandi}>{bookedPass?.centreName}</Text>
            </View>

            {/* Pass Details */}
            <View style={styles.passDetailsBox}>
              <View style={styles.passDetailRow}>
                <Text style={styles.pdl}>Commodity:</Text>
                <Text style={styles.pdv}>{bookedPass?.crop}</Text>
              </View>
              <View style={styles.passDetailRow}>
                <Text style={styles.pdl}>Quantity:</Text>
                <Text style={styles.pdv}>{bookedPass?.quantityKg} Kg</Text>
              </View>
              <View style={styles.passDetailRow}>
                <Text style={styles.pdl}>Reporting Slot:</Text>
                <Text style={styles.pdv}>{bookedPass?.slot}</Text>
              </View>
              <View style={styles.passDetailRow}>
                <Text style={styles.pdl}>Arrival Gate:</Text>
                <Text style={[styles.pdv, { color: '#059669', fontWeight: '900' }]}>
                  GATE 2 (Weighbridge Inward)
                </Text>
              </View>
            </View>

            {/* Barcode / QR Simulation */}
            <View style={styles.qrRow}>
              <QrCode size={40} color="#166534" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.qrCodeText}>FAR-{bookedPass?.id}-SIH26032</Text>
                <Text style={styles.qrCodeSub}>Scan at entry boom barrier for instant RFID check-in</Text>
              </View>
            </View>

            {/* Navigation Actions */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.viewQueueBtn}
                onPress={() => {
                  setShowPassModal(false);
                  router.push('/(tabs)/queue' as any);
                }}
              >
                <Text style={styles.viewQueueBtnText}>VIEW LIVE QUEUE</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewCctvBtn}
                onPress={() => {
                  setShowPassModal(false);
                  router.push('/procurement-status' as any);
                }}
              >
                <Video size={16} color="#065F46" />
                <Text style={styles.viewCctvBtnText}>CCTV & Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepSub: {
    fontSize: 11,
    color: '#64748B',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cropChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  cropChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  cropChipTextSelected: {
    color: '#FFFFFF',
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  qtyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  mspBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 12,
  },
  mspLeft: {
    flex: 1,
  },
  mspRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mspDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#86EFAC',
    marginHorizontal: 10,
  },
  mspTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  mspRate: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B',
    marginTop: 2,
  },
  mspTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 2,
  },
  centreCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  centreCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  centreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centreName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  loadChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  loadChipLow: { backgroundColor: '#DCFCE7' },
  loadChipMed: { backgroundColor: '#FEF3C7' },
  loadChipHigh: { backgroundColor: '#FEE2E2' },
  loadChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  centreMetricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  centreSelectedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  centreSelectedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dateBtnSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dateBtnTextSelected: {
    color: '#FFFFFF',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  slotItemSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  slotItemFull: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    opacity: 0.6,
  },
  slotItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  slotItemTextSelected: {
    color: '#FFFFFF',
  },
  slotItemTextFull: {
    color: '#DC2626',
  },
  slotSeatsText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  vehicleCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  vehicleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  vehicleTextSelected: {
    color: '#064E3B',
    fontWeight: '800',
  },
  farmerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  farmerBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fbLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  fbVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  bookActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  passHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  passSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  tokenHighlightBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#86EFAC',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  tokenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
  },
  tokenNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: '#064E3B',
    marginVertical: 2,
  },
  tokenMandi: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  passDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 14,
  },
  passDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdl: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  pdv: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  qrCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrCodeSub: {
    fontSize: 10,
    color: '#64748B',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  viewQueueBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewQueueBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  viewCctvBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewCctvBtnText: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 12,
  },
});
