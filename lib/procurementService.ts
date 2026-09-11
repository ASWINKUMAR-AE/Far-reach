import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Farmer, 
  ProcurementCentre, 
  ProcurementBooking, 
  ProcurementRecord, 
  FarReachNotification,
  FullQueueDetails,
  QueueLevel,
  CounterDetail
} from './types';
import * as apiClient from './apiClient';

const STORAGE_KEYS = {
  FARMER: 'far_reach_farmer',
  CENTRES: 'far_reach_centres',
  ACTIVE_BOOKING: 'far_reach_active_booking',
  RECORD: 'far_reach_procurement_record',
  NOTIFICATIONS: 'far_reach_notifications',
};

// Initial SIH26032 Mock/Demo Data Fallback
export const DEFAULT_FARMER: Farmer = {
  id: 'F1021',
  name: 'Ramesh Kumar',
  phone: '+91 98765 43210',
  language: 'Tamil',
  district: 'Tiruchirappalli',
  upiId: 'rameshkumar@upi',
  bankAccount: 'XXXX-XXXX-1234',
  bankIfsc: 'SBIN0001234',
};

export const INITIAL_CENTRES: ProcurementCentre[] = [
  {
    id: 'CTR-01',
    name: 'Samayapuram Procurement Centre',
    distanceKm: 5.8,
    capacity: 43,
    booked: 147,
    currentToken: 132,
    averageProcessingMinutes: 3,
    loadStatus: 'LOW',
    operatingHours: '08:00 AM - 06:00 PM',
    address: 'NH 45, Near Toll Gate, Samayapuram',
    contactNumber: '+91 431 2700123',
    countersCount: 4,
  },
  {
    id: 'CTR-02',
    name: 'Manachanallur Mandi',
    distanceKm: 8.2,
    capacity: 92,
    booked: 210,
    currentToken: 88,
    averageProcessingMinutes: 5,
    loadStatus: 'HIGH',
    operatingHours: '07:30 AM - 07:00 PM',
    address: 'Main Road, Manachanallur',
    contactNumber: '+91 431 2700456',
    countersCount: 2,
  },
  {
    id: 'CTR-03',
    name: 'Lalgudi Direct Purchase Centre',
    distanceKm: 12.4,
    capacity: 71,
    booked: 160,
    currentToken: 105,
    averageProcessingMinutes: 4,
    loadStatus: 'MEDIUM',
    operatingHours: '08:00 AM - 05:00 PM',
    address: 'Station Road, Lalgudi',
    contactNumber: '+91 431 2700789',
    countersCount: 3,
  },
];

export const INITIAL_BOOKING: ProcurementBooking = {
  id: 'BK-9042',
  farmerId: 'F1021',
  centreId: 'CTR-01',
  centreName: 'Samayapuram Procurement Centre',
  crop: 'Paddy (A-Grade)',
  quantityKg: 500,
  slot: '10:30 AM - 11:00 AM',
  date: '2026-09-03',
  token: 147,
  status: 'WEIGHING',
  createdAt: '2026-09-02T10:00:00Z',
};

export const INITIAL_RECORD: ProcurementRecord = {
  bookingId: 'BK-9042',
  token: 147,
  crop: 'Paddy (A-Grade)',
  grossWeightKg: 520,
  tareWeightKg: 20,
  netWeightKg: 500,
  ratePerKg: 23.50,
  totalAmount: 11750, // 500 * 23.50
  qualityGrade: 'Grade A',
  moisturePercentage: 12.4,
  procurementStatus: 'ACCEPTED',
  paymentStatus: 'PROCESSING',
  transactionRef: 'TXN-20260902-8821',
  weighingTimestamp: '2026-09-02T14:30:00Z',
};

export const INITIAL_NOTIFICATIONS: FarReachNotification[] = [
  {
    id: 'NOTIF-1',
    title: 'Slot Confirmed',
    message: 'Your slot at Samayapuram Procurement Centre (10:30 AM) is confirmed. Token #147.',
    timestamp: '10:00 AM',
    type: 'SLOT',
    read: true,
  },
  {
    id: 'NOTIF-2',
    title: 'Queue Approaching',
    message: 'Your token #147 is approaching. Current token is #132 (15 farmers ahead).',
    timestamp: '02:15 PM',
    type: 'QUEUE',
    read: false,
  },
  {
    id: 'NOTIF-3',
    title: 'Weighing Complete',
    message: 'Net Weight: 500 kg @ ₹23.50/kg. Total amount ₹11,750 confirmed.',
    timestamp: '02:35 PM',
    type: 'WEIGHING',
    read: false,
  },
];

// ----------------------------------------------------------------
// Dynamic Queue Management & Multi-Counter Calculations
// ----------------------------------------------------------------

export function calculateETA(currentToken: number, farmerToken: number, avgMinutesPerFarmer: number): number {
  const farmersAhead = Math.max(0, farmerToken - currentToken);
  return farmersAhead * avgMinutesPerFarmer;
}

export function calculateFullQueueDetails(
  farmerToken: number,
  currentToken: number,
  centre: ProcurementCentre
): FullQueueDetails {
  const farmersAhead = farmerToken - currentToken;
  const isMissed = farmersAhead < 0;
  const avgProcessing = centre.averageProcessingMinutes || 3;
  const estimatedWaitingMinutes = isMissed ? 0 : Math.max(0, farmersAhead * avgProcessing);

  let queueLevel: QueueLevel = 'MORE_THAN_10_AHEAD';
  let statusMessage = `${farmersAhead} farmers ahead in queue. Estimated waiting time: ~${estimatedWaitingMinutes} mins.`;
  let alertLevel: 'INFO' | 'WARNING' | 'URGENT' | 'SUCCESS' = 'INFO';

  if (isMissed) {
    queueLevel = 'MISSED';
    statusMessage = '⚠️ Your token turn has passed. Please click "Request Re-Queue" to rejoin.';
    alertLevel = 'WARNING';
  } else if (farmersAhead === 0) {
    queueLevel = 'YOUR_TURN';
    statusMessage = '🎉 YOUR TURN! Proceed immediately to Counter 2 for weighing.';
    alertLevel = 'SUCCESS';
  } else if (farmersAhead === 1) {
    queueLevel = 'NEXT';
    statusMessage = '🔔 YOU ARE NEXT! Please stand by Counter 2.';
    alertLevel = 'URGENT';
  } else if (farmersAhead <= 4) {
    queueLevel = 'NEAR_TURN';
    statusMessage = `⚡ NEAR TURN! ${farmersAhead} farmers ahead (~${estimatedWaitingMinutes} mins). Please arrive at entry gate.`;
    alertLevel = 'URGENT';
  } else if (farmersAhead <= 10) {
    queueLevel = '5_TO_10_AHEAD';
    statusMessage = `📍 ${farmersAhead} farmers ahead (~${estimatedWaitingMinutes} mins). Please start heading to the centre.`;
    alertLevel = 'WARNING';
  }

  // Multi-counter simulation
  const counters: CounterDetail[] = [
    { counterNumber: 1, currentToken: currentToken, processingSpeedMin: avgProcessing, status: 'ACTIVE' },
    { counterNumber: 2, currentToken: Math.min(farmerToken, currentToken + 1), processingSpeedMin: avgProcessing, status: 'ACTIVE' },
    { counterNumber: 3, currentToken: Math.max(1, currentToken - 2), processingSpeedMin: avgProcessing + 1, status: 'ACTIVE' },
    { counterNumber: 4, currentToken: Math.max(1, currentToken - 3), processingSpeedMin: avgProcessing, status: 'PAUSED' },
  ];

  return {
    centreId: centre.id,
    centreName: centre.name,
    currentToken,
    farmerToken,
    farmersAhead: Math.max(0, farmersAhead),
    averageProcessingMinutes: avgProcessing,
    estimatedWaitingMinutes,
    processingSpeedMin: avgProcessing,
    queueLevel,
    counters,
    assignedCounter: 2,
    statusMessage,
    alertLevel,
    isMissed,
  };
}

// ----------------------------------------------------------------
// Weighing Calculation & Validation
// ----------------------------------------------------------------

export function calculateWeighing(grossKg: number, tareKg: number, ratePerKg: number) {
  if (grossKg <= 0) {
    throw new Error('Gross weight must be greater than zero.');
  }
  if (tareKg < 0) {
    throw new Error('Tare weight cannot be negative.');
  }
  if (tareKg >= grossKg) {
    throw new Error('Tare weight cannot be greater than or equal to gross weight.');
  }
  const netKg = grossKg - tareKg;
  const total = netKg * ratePerKg;
  return {
    netWeightKg: netKg,
    totalAmount: total,
  };
}

// ----------------------------------------------------------------
// Async Functions with Live API + Local Storage / Mock Fallback
// ----------------------------------------------------------------

export async function getActiveBooking(): Promise<ProcurementBooking> {
  try {
    const liveRes = await apiClient.fetchActiveBooking();
    if (liveRes?.data) {
      const b = liveRes.data;
      const mapped: ProcurementBooking = {
        id: b.booking_code || b.bookingId || b.id || 'BK-9042',
        farmerId: b.farmerId || 'F1021',
        centreId: b.centreId || 'CTR-01',
        centreName: b.centreName || 'Samayapuram Procurement Centre',
        crop: b.crop || 'Paddy (A-Grade)',
        quantityKg: b.quantityKg || 500,
        slot: b.slot || '10:30 AM - 11:00 AM',
        date: b.date || new Date().toISOString().split('T')[0],
        token: parseInt(b.tokenDisplay?.replace('#', '') || b.token || '147', 10),
        status: b.status || 'BOOKED',
        createdAt: b.createdAt || new Date().toISOString(),
      };
      await saveActiveBooking(mapped);
      return mapped;
    }
  } catch (e) {
    console.log('[ProcurementService] Active booking live API offline, using local state.');
  }

  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_BOOKING);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Error reading active booking:', e);
  }
  return INITIAL_BOOKING;
}

export async function saveActiveBooking(booking: ProcurementBooking): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_BOOKING, JSON.stringify(booking));
  } catch (e) {
    console.warn('Error saving active booking:', e);
  }
}

export async function getProcurementCentres(): Promise<ProcurementCentre[]> {
  try {
    const liveRes = await apiClient.fetchProcurementCentres();
    if (liveRes?.data && Array.isArray(liveRes.data)) {
      const centres = liveRes.data.map((c: any) => ({
        id: c.centre_code || c.id || 'CTR-01',
        name: c.name || 'Procurement Centre',
        distanceKm: c.distanceKm || 5.0,
        capacity: c.capacity || 50,
        booked: c.booked_count || c.booked || 100,
        currentToken: c.currentToken || 80,
        averageProcessingMinutes: c.averageProcessingMinutes || 4,
        loadStatus: c.load_status || c.loadStatus || 'MEDIUM',
        operatingHours: c.operatingHours || '08:00 AM - 06:00 PM',
        address: c.address || c.district || 'Procurement Mandi',
        contactNumber: c.contactNumber || '+91 98765 43210',
        countersCount: c.countersCount || 3,
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(centres));
      return centres;
    }
  } catch (e) {
    console.log('[ProcurementService] Centres live API offline, using local storage.');
  }

  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CENTRES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Error reading centres:', e);
  }
  return INITIAL_CENTRES;
}

export async function getProcurementRecord(): Promise<ProcurementRecord> {
  try {
    const active = await getActiveBooking();
    const liveRes = await apiClient.fetchPaymentRecord(active.id);
    if (liveRes?.data) {
      const p = liveRes.data;
      const rec: ProcurementRecord = {
        bookingId: active.id,
        token: active.token,
        crop: active.crop,
        grossWeightKg: 520,
        tareWeightKg: 20,
        netWeightKg: p.netWeightKg || 500,
        ratePerKg: 23.50,
        totalAmount: p.amount || 11750,
        qualityGrade: 'Grade A',
        moisturePercentage: 12.4,
        procurementStatus: 'ACCEPTED',
        paymentStatus: p.status === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING',
        transactionRef: p.transactionReference || 'TXN-20260902-8821',
        weighingTimestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.RECORD, JSON.stringify(rec));
      return rec;
    }
  } catch (e) {
    console.log('[ProcurementService] Payment record live API offline, using local record.');
  }

  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECORD);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Error reading record:', e);
  }
  return INITIAL_RECORD;
}

export async function getNotifications(): Promise<FarReachNotification[]> {
  try {
    const liveRes = await apiClient.fetchNotificationsList();
    if (liveRes?.data && Array.isArray(liveRes.data)) {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(liveRes.data));
      return liveRes.data;
    }
  } catch (e) {
    console.log('[ProcurementService] Notifications live API offline, using local notifications.');
  }

  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Error reading notifications:', e);
  }
  return INITIAL_NOTIFICATIONS;
}

export async function createBooking(
  centre: ProcurementCentre, 
  crop: string, 
  quantityKg: number, 
  slot: string
): Promise<ProcurementBooking> {
  try {
    const liveRes = await apiClient.bookProcurementSlot({
      centreId: centre.id,
      crop,
      quantityKg,
      slot,
    });
    if (liveRes?.data) {
      const b = liveRes.data;
      const newBooking: ProcurementBooking = {
        id: b.booking_code || `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        farmerId: DEFAULT_FARMER.id,
        centreId: centre.id,
        centreName: centre.name,
        crop,
        quantityKg,
        slot,
        date: new Date().toISOString().split('T')[0],
        token: parseInt(b.tokenDisplay?.replace('#', '') || `${centre.booked + 1}`, 10),
        status: b.status || 'BOOKED',
        createdAt: new Date().toISOString(),
      };
      await saveActiveBooking(newBooking);
      return newBooking;
    }
  } catch (e) {
    console.log('[ProcurementService] Live slot booking failed/offline, fallback to local storage.');
  }

  const fallbackBooking: ProcurementBooking = {
    id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
    farmerId: DEFAULT_FARMER.id,
    centreId: centre.id,
    centreName: centre.name,
    crop,
    quantityKg,
    slot,
    date: new Date().toISOString().split('T')[0],
    token: centre.booked + 1,
    status: 'BOOKED',
    createdAt: new Date().toISOString(),
  };

  await saveActiveBooking(fallbackBooking);
  return fallbackBooking;
}

export async function requestRequeue(currentBooking: ProcurementBooking): Promise<ProcurementBooking> {
  const updatedBooking: ProcurementBooking = {
    ...currentBooking,
    token: currentBooking.token + 8, // Assign new position 8 tokens ahead of current
    status: 'CHECKED_IN',
  };
  await saveActiveBooking(updatedBooking);
  return updatedBooking;
}

export async function reallocateCentre(
  currentBooking: ProcurementBooking,
  newCentre: ProcurementCentre
): Promise<ProcurementBooking> {
  const updatedBooking: ProcurementBooking = {
    ...currentBooking,
    centreId: newCentre.id,
    centreName: newCentre.name,
    token: newCentre.booked + 1,
    status: 'BOOKED',
  };
  await saveActiveBooking(updatedBooking);
  return updatedBooking;
}
