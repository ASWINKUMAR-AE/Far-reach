# 🌱 Far-Reach — Smart Farming & Procurement Operating System

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020.svg?style=flat&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg?style=flat&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Far-Reach** is a production-ready, cross-platform (Android, iOS, Web) operating system for Indian farmers and mandi procurement centres. It unites **precision agriculture** (AI crop advice, soil testing, disease detection, market trends) with **transparent mandi procurement** (digital token allocation, live queue tracking, digital weighbridge integration, quality grading, and direct payment tracking).

---

## 🚀 Key Modules & Features

### 🌾 1. Smart Agronomy & Precision Farming
- **AI Crop Recommendations (`app/crop-recommendations.tsx`)**: Machine-learning backed suggestions matching soil parameters, climate, season, and market demand with estimated profit margins.
- **Multi-Modal Soil Analysis (`app/soil-input.tsx`)**: Input soil parameters via manual NPK entry, lab test CSV upload, satellite indices, or camera-based soil scanning.
- **Crop Disease Scanner (`app/(tabs)/CropScanner.tsx`)**: Camera & gallery integration powered by `expo-camera` and `expo-image-picker` to detect leaf blight, pests, and nutrient deficiencies.
- **Crop Rotation Advisory (`app/(tabs)/Crop_rotation.tsx`)**: Season-wise crop rotation planner preserving nitrogen levels and soil moisture.
- **Field & Plot Management (`app/(tabs)/fields.tsx`)**: Geospatial field mapping with GPS location pinning and cross-platform OpenStreetMap support.
- **Live Market Trends (`app/(tabs)/market.tsx`)**: Real-time mandi prices, mandi comparison, and historical price movements across commodities.

### 🏛️ 2. Mandi Procurement & Queue OS (SIH26032)
- **Digital Token Allocation & Check-in (`app/checkin.tsx`)**: Generates digital mandi slot tokens to eliminate overnight farmer queueing.
- **Live Queue Monitoring (`app/(tabs)/queue.tsx`)**: Real-time status of mandi queues, counter assignments, and estimated wait times.
- **Procurement Booking & Status (`app/(tabs)/procurement.tsx`, `app/procurement-status.tsx`)**: End-to-end status tracking of grain procurement lots from slot booking to warehouse acceptance.
- **Digital Weighbridge Integration (`app/weighing.tsx`)**: Automated gross, tare, and net weight logging with instant price calculations.
- **Quality Check & Grading (`app/quality-check.tsx`)**: Moisture, foreign matter, and grain damage grading linked directly to MSP deduction standards.
- **Payments & Transparent Receipts (`app/(tabs)/payments.tsx`)**: Direct bank transfer (DBT) payment tracking, transaction reference IDs, and downloadable receipts.
- **Mandi Centre Details (`app/centre-details.tsx`)**: Procurement centre operating hours, nodal officer contacts, storage capacity, and accepted crops.
- **Farmer Grievance Desk (`app/complaints.tsx`)**: Register and track resolution of payment or weighing discrepancies.

### 🎙️ 3. AI Voice Assistant (`app/chat-assistant.tsx`)
- **Multilingual Support**: Real-time voice assistance in English, Hindi, Tamil, Telugu, Bengali, Malayalam, Kannada, Santali, Marathi, Gujarati, and Punjabi.
- **Dual-Engine Speech-to-Text (STT)**: Web Speech API for desktop/mobile browsers + `@react-native-voice/voice` for native builds.
- **Text-to-Speech (TTS)**: Voice responses read aloud using `expo-speech` with adjustable speed and pitch.
- **Backend AI Engine**: Integrated with the **Hosit AI Microservice** (`http://106.51.21.4:8000/api/chat`) with fallback to OpenRouter (DeepSeek).

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Expo](https://expo.dev) SDK 54 (`~54.0.0`) |
| **Core** | React Native `0.81.5`, React `19.1.0` |
| **Language** | TypeScript `~5.9.2` |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) `~6.0.24` (File-based navigation) |
| **State Store** | [Zustand](https://github.com/pmndrs/zustand) `^5.0.8` |
| **Styling** | NativeWind / Tailwind CSS, React Native StyleSheet |
| **Offline Persistence** | `@react-native-async-storage/async-storage` `^2.2.0` |
| **Icons & UI** | `lucide-react-native`, `@expo/vector-icons` |
| **Internationalization** | `i18next`, `react-i18next` |
| **Target Platforms** | Android (APK / AAB), iOS, Web (PWA / Responsive Browser) |

---

## 📁 Project Structure

```
far-reach/
├── app/                          # Expo Router navigation routes
│   ├── (onboarding)/             # Splash, Welcome & Farmer Auth screens
│   │   ├── splash.tsx
│   │   ├── welcome.tsx
│   │   └── auth.tsx
│   ├── (tabs)/                   # Core bottom tab navigation
│   │   ├── index.tsx             # Farmer dashboard & weather
│   │   ├── procurement.tsx       # Mandi procurement slot manager
│   │   ├── queue.tsx             # Live token queue tracker
│   │   ├── payments.tsx          # Payment receipts & transaction ledger
│   │   ├── market.tsx            # Mandi commodity market prices
│   │   ├── fields.tsx            # Field geo-mapping
│   │   ├── CropScanner.tsx       # AI disease scanner
│   │   └── Crop_rotation.tsx     # Seasonal rotation advisor
│   ├── chat-assistant.tsx        # Multilingual voice & chat assistant
│   ├── soil-input.tsx            # Multi-modal soil data entry
│   ├── crop-recommendations.tsx  # ML recommendation engine
│   ├── weighing.tsx              # Mandi digital weighbridge
│   ├── quality-check.tsx         # Produce grading & moisture check
│   ├── centre-details.tsx        # Procurement centre details
│   ├── complaints.tsx            # Grievance registration desk
│   └── _layout.tsx               # Root layout & providers
├── components/                   # Reusable components
│   ├── home/                     # Weather card & recent activities
│   ├── maps/                     # Cross-platform FieldMap (Native + Web)
│   └── ui/                       # Base cards, spinners, progress bars
├── lib/                          # Services & utilities
│   ├── apiClient.ts              # HTTP client with timeouts & retry logic
│   ├── hositAI.ts                # Hosit AI & OpenRouter integration
│   ├── procurementService.ts     # Mock procurement backend store
│   └── types.ts                  # Shared domain data models
├── assets/                       # Static branding, splash screens, icons
├── i18n/                         # Localization resources (en, hi, ta)
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or `v20.x` (LTS recommended)
- **Package Manager**: `npm` (v9+)
- **Mobile Testing**: [Expo Go](https://expo.dev/go) app (Android / iOS)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ASWINKUMAR-AE/Far-reach.git
   cd far-reach
   ```

2. **Checkout your team branch:**
   ```bash
   git checkout prakash   # or git checkout aswin
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

---

## 💻 Running the App

### 1. Web Browser Mode (Fastest Development)
```bash
npx expo start --web
```
Opens the app on [http://localhost:8081](http://localhost:8081) with live hot reloading.

### 2. Mobile Device (Expo Go)
```bash
npx expo start -c
```
Scan the displayed QR code with the **Expo Go** app on Android or iOS.

### 3. Android Emulator / iOS Simulator
```bash
npm run android   # For Android emulator
npm run ios       # For iOS simulator (macOS required)
```

---

## 🏗️ Production Builds

### Web Production Export
```bash
npm run build:web
```
Bundles the optimized static production application into the `dist/` folder.

### Native Android / iOS (via Expo Application Services)
```bash
# Build standalone Android APK
npx eas build --platform android --profile preview

# Build iOS Release
npx eas build --platform ios --profile production
```

---

## 🌐 External Services & APIs

| Service | Protocol / Endpoint | Purpose |
| :--- | :--- | :--- |
| **Hosit AI Microservice** | `http://106.51.21.4:8000/api/chat` | Primary agronomy & procurement LLM |
| **OpenRouter (DeepSeek)** | `https://openrouter.ai/api/v1/chat/completions` | Backup conversational LLM |
| **OpenMeteo API** | `https://api.open-meteo.com/v1/forecast` | Hyperlocal weather & precipitation |
| **OpenStreetMap** | `https://www.openstreetmap.org` | Cross-platform web map tiles |

---

## 👥 Team & Collaboration

| Contributor | GitHub Handle | Role | Assigned Branch |
| :--- | :--- | :--- | :--- |
| **Aswin Kumar** | [`@ASWINKUMAR-AE`](https://github.com/ASWINKUMAR-AE) | Core Lead / Architecture | `aswin` |
| **Prakash** | [`@prakash2006-xl`](https://github.com/prakash2006-xl) | Feature Development / Integration | `prakash` |
| **Production** | — | Verified stable builds | `main` |

*Refer to [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md) for branch syncing, PR review, and commit standards.*

---

## 📄 License
This project is open-source and licensed under the **MIT License**.