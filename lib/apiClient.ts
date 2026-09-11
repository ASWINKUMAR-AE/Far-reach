import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  process.env.VITE_API_BASE_URL || 
  'http://106.51.21.4:6001/api/v1';

export const TOKEN_STORAGE_KEY = 'far_reach_token';

/**
 * Generic HTTP Request Wrapper with 10s Timeout & JWT Token Interception
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { message: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorJson?.message || errorJson?.detail || `API request failed (${response.status})`);
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout (${timeoutMs / 1000}s) connecting to ${url}`);
    }
    throw error;
  }
}

// ----------------------------------------------------
// A. Authentication & User Profile APIs
// ----------------------------------------------------
export async function authLogin(phone_number: string) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone_number }),
  });
}

export async function verifyOtp(phone_number: string, otp: string) {
  const res = await apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number, otp }),
  });
  if (res?.data?.access_token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, res.data.access_token);
  }
  return res;
}

export async function getFarmerProfile() {
  return apiRequest('/farmers/profile', { method: 'GET' });
}

// ----------------------------------------------------
// B. Procurement Centres & Slot Recommendation APIs
// ----------------------------------------------------
export async function fetchProcurementCentres() {
  return apiRequest('/procurement/centres', { method: 'GET' });
}

export async function recommendSlots(payload: {
  crop: string;
  quantityKg: number;
  user_lat: number;
  user_lng: number;
}) {
  return apiRequest('/procurement/slots/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------
// C. Slot Booking & Active Token Queue APIs
// ----------------------------------------------------
export async function bookProcurementSlot(payload: {
  centreId: string;
  crop: string;
  quantityKg: number;
  slot: string;
}) {
  return apiRequest('/procurement/book-slot', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchActiveBooking() {
  return apiRequest('/procurement/active-booking', { method: 'GET' });
}

export async function fetchQueueStatus(centreCode: string) {
  return apiRequest(`/procurement/queue-status/${centreCode}`, { method: 'GET' });
}

// ----------------------------------------------------
// D. Procurement Operations APIs
// ----------------------------------------------------
export async function checkinGate(bookingId: string) {
  return apiRequest('/procurement/checkin', {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  });
}

export async function postWeighingRecord(payload: {
  bookingId: string;
  grossWeightKg: number;
  tareWeightKg: number;
  ratePerKg: number;
}) {
  return apiRequest('/procurement/weighing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function postQualityInspection(payload: {
  bookingId: string;
  qualityGrade: string;
  moisturePercentage: number;
}) {
  return apiRequest('/procurement/quality', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPaymentRecord(bookingCode: string) {
  return apiRequest(`/payments/${bookingCode}`, { method: 'GET' });
}

// ----------------------------------------------------
// E. AI Chat Integration API
// ----------------------------------------------------
export async function postAiChat(payload: {
  message: string;
  user_id?: string;
  context?: string;
}) {
  return apiRequest('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: payload.message,
      user_id: payload.user_id || 'F1021',
      context: payload.context || 'Farmer Procurement',
    }),
  });
}

// ----------------------------------------------------
// F. Farm Fields, Crop Declarations & Soil Analysis APIs
// ----------------------------------------------------
export async function fetchFields() {
  return apiRequest('/fields', { method: 'GET' });
}

export async function createField(payload: any) {
  return apiRequest('/fields', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function postSoilAnalysis(payload: {
  n: number;
  p: number;
  k: number;
  ph: number;
}) {
  return apiRequest('/soil/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMarketPrices() {
  return apiRequest('/market/prices', { method: 'GET' });
}

export async function fetchWeatherForecast() {
  return apiRequest('/weather', { method: 'GET' });
}

export async function fetchNotificationsList() {
  return apiRequest('/notifications', { method: 'GET' });
}

export async function fetchComplaints() {
  return apiRequest('/complaints', { method: 'GET' });
}

export async function createComplaint(payload: {
  category: string;
  description: string;
}) {
  return apiRequest('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
