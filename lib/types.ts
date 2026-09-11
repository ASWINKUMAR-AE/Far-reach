export type Farmer = {
  id: string;
  name: string;
  phone: string;
  language: string;
  district: string;
  upiId?: string;
  bankAccount?: string;
  bankIfsc?: string;
};

export type CropDeclaration = {
  id: string;
  farmerId: string;
  crop: string;
  quantityKg: number;
  harvestDate?: string;
  variety?: string;
  qualityGrade?: string;
};

export type LoadStatus = 'LOW' | 'MEDIUM' | 'HIGH';

export type ProcurementCentre = {
  id: string;
  name: string;
  distanceKm: number;
  capacity: number; // Percentage 0-100
  booked: number;
  currentToken: number;
  averageProcessingMinutes: number;
  loadStatus: LoadStatus;
  operatingHours: string;
  address: string;
  contactNumber: string;
  countersCount: number;
};

export type BookingStatus = 
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'WEIGHING'
  | 'QUALITY_CHECK'
  | 'PROCUREMENT_ACCEPTED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'MISSED'
  | 'CANCELLED';

export type ProcurementBooking = {
  id: string;
  farmerId: string;
  centreId: string;
  centreName: string;
  crop: string;
  quantityKg: number;
  slot: string;
  date: string;
  token: number;
  status: BookingStatus;
  createdAt: string;
};

export type ProcurementRecord = {
  bookingId: string;
  token: number;
  crop: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  ratePerKg: number;
  totalAmount: number;
  qualityGrade: string;
  moisturePercentage: number;
  procurementStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  paymentStatus: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transactionRef?: string;
  weighingTimestamp?: string;
};

export type FarReachNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'SLOT' | 'QUEUE' | 'CONGESTION' | 'WEIGHING' | 'PAYMENT' | 'CHECK-IN' | 'QUALITY' | 'SYSTEM';
  read: boolean;
};

export type QueueLevel = 
  | 'MORE_THAN_10_AHEAD'
  | '5_TO_10_AHEAD'
  | 'NEAR_TURN'
  | 'NEXT'
  | 'YOUR_TURN'
  | 'MISSED'
  | 'COMPLETED';

export type CounterDetail = {
  counterNumber: number;
  currentToken: number;
  processingSpeedMin: number;
  status: 'ACTIVE' | 'PAUSED' | 'IDLE';
};

export type FullQueueDetails = {
  centreId: string;
  centreName: string;
  currentToken: number;
  farmerToken: number;
  farmersAhead: number;
  averageProcessingMinutes: number;
  estimatedWaitingMinutes: number;
  processingSpeedMin: number;
  queueLevel: QueueLevel;
  counters: CounterDetail[];
  assignedCounter: number;
  statusMessage: string;
  alertLevel: 'INFO' | 'WARNING' | 'URGENT' | 'SUCCESS';
  isMissed: boolean;
};

export type HositAIRequest = {
  message: string;
  userId: string;
  context: string;
};

export type HositAIResponse = {
  status: 'success' | 'error';
  ai_response: string;
  detail?: any;
};
