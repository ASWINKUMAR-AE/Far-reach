# KisanMitra - AI-Based Crop Recommendation App

A comprehensive React Native Expo application designed for Indian farmers to get AI-powered crop recommendations, soil analysis, market insights, and farming assistance.

## Features

### 🌾 Core Functionality
- **Soil Analysis**: Multiple input methods (manual, CSV upload, satellite data, camera scan)
- **AI Crop Recommendations**: Smart suggestions based on soil conditions and local climate
- **Market Trends**: Real-time crop prices and market insights
- **Voice Assistant**: Multilingual chat interface with TTS/STT support
- **Field Management**: Track multiple fields with location mapping
- **Crop Monitoring**: Disease detection using camera analysis

### 🎯 User Experience
- **Multilingual Support**: English + Hindi with easy language switching
- **Offline-First**: Local data caching with sync indicators
- **Accessibility**: High contrast, large fonts, screen reader support
- **Voice Interface**: Speech-to-text and text-to-speech capabilities
- **Responsive Design**: Optimized for mobile devices

### 🔧 Technical Stack
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: Expo Router with tab + stack navigation
- **State Management**: Zustand for global state
- **Internationalization**: i18next + react-i18next
- **Testing**: Jest + React Native Testing Library

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Expo Go app on your mobile device (for development)

### Installation

1. **Clone and setup the project:**
   ```bash
   git clone <repository-url>
   cd kisan-mitra-app
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Run on your device:**
   - Install Expo Go from App Store/Play Store
   - Scan the QR code displayed in terminal
   - The app will load on your device

### Build for Production

```bash
# Web build
npm run build:web

# iOS/Android builds (requires Expo EAS)
npx eas build --platform ios
npx eas build --platform android
```

## Project Structure

```
├── app/                      # Expo Router screens
│   ├── (onboarding)/        # Onboarding flow
│   ├── (tabs)/              # Main tab navigation
│   ├── soil-input.tsx       # Soil analysis screen
│   ├── crop-recommendations.tsx
│   ├── chat-assistant.tsx   # Voice/chat interface
│   └── _layout.tsx          # Root layout
├── components/              # Reusable UI components
│   ├── ui/                  # Base UI components
│   └── home/                # Home screen components
├── i18n/                    # Internationalization
│   ├── config.ts            # i18next setup
│   └── locales/             # Translation files
├── hooks/                   # Custom React hooks
├── stores/                  # Zustand state stores
├── types/                   # TypeScript type definitions
├── assets/                  # Images and static assets
└── README.md
```

## Key Components

### Soil Analysis (`app/soil-input.tsx`)
Multiple input methods for soil data:
- Manual parameter entry
- CSV file upload
- Satellite imagery analysis
- Camera-based soil scanning

### Crop Recommendations (`app/crop-recommendations.tsx`)
AI-powered suggestions featuring:
- Estimated yield and profit projections
- Sustainability scoring
- Risk assessment (pest, drought, disease)
- Detailed farming plans with fertilizer and irrigation schedules

### Voice Assistant (`app/chat-assistant.tsx`)
Conversational interface with:
- Text and voice input
- Quick action prompts
- TTS playback for responses
- Farming-specific knowledge base

### Reusable Components (`components/ui/`)
- `Card`: Styled container with shadow and border
- `ProgressBar`: Animated progress indicator
- `LoadingSpinner`: Loading state component

## Backend Integration

### Required API Endpoints

```typescript
// Soil analysis from satellite data
POST /api/soil/satellite-analysis
{
  "latitude": number,
  "longitude": number,
  "fieldId": string
}

// Crop recommendations
POST /api/crops/recommendations
{
  "soilData": SoilData,
  "location": { lat, lng },
  "season": string,
  "fieldSize": number
}

// Market prices
GET /api/market/prices?crop=wheat&location=delhi

// AI chat assistant
POST /api/chat/assistant
{
  "message": string,
  "context": ChatContext,
  "language": string
}

// Weather data
GET /api/weather/current?lat=28.6&lng=77.2
GET /api/weather/forecast?lat=28.6&lng=77.2&days=7
```

### Environment Variables

Create a `.env` file for API configuration:

```env
# API Base URL
EXPO_PUBLIC_API_URL=https://your-api.com

# External Services (get from respective providers)
EXPO_PUBLIC_WEATHER_API_KEY=your_weather_api_key
EXPO_PUBLIC_SATELLITE_API_KEY=your_satellite_api_key
EXPO_PUBLIC_MAPS_API_KEY=your_maps_api_key

# LLM/AI Services
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### Recommended External APIs

1. **Weather**: OpenWeatherMap API or AccuWeather
2. **Satellite Imagery**: NASA MODIS, Sentinel Hub, or Google Earth Engine
3. **Maps**: Google Maps API or Mapbox
4. **Market Data**: Government APIs (eNAM) or agricultural data providers
5. **AI/LLM**: OpenAI GPT, Google Gemini, or Anthropic Claude

## Testing

Run the test suite:

```bash
npm test
```

Example test structure:
```typescript
// components/ui/__tests__/Card.test.tsx
import { render } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card><Text>Test Content</Text></Card>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });
});
```

## Accessibility

The app implements comprehensive accessibility features:

- **Screen Reader**: Full VoiceOver/TalkBack support
- **High Contrast**: WCAG AA compliant color combinations
- **Large Touch Targets**: Minimum 44px touch areas
- **Semantic Labels**: Proper accessibility labels and hints
- **Focus Management**: Logical tab order and focus indicators

## Localization

Adding new languages:

1. Create translation file: `i18n/locales/[lang].json`
2. Add to resources in `i18n/config.ts`
3. Update language picker in settings

## Offline Support

The app is designed for low-connectivity regions:

- **Local Storage**: Critical data cached using AsyncStorage
- **Sync Indicators**: Visual feedback for online/offline state
- **Queue System**: Actions queued when offline, synced when online
- **Fallback Content**: Default recommendations when APIs unavailable

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes following the existing code style
4. Add tests for new functionality
5. Submit a pull request

## Security Considerations

- **API Keys**: Never commit API keys to version control
- **Input Validation**: Sanitize all user inputs
- **Authentication**: Implement JWT-based auth for production
- **Data Privacy**: Follow local data protection regulations
- **HTTPS**: Ensure all API communications use HTTPS

## Deployment

### Production Checklist
- [ ] Replace all dummy data with real API calls
- [ ] Add proper error handling and logging
- [ ] Implement analytics and crash reporting
- [ ] Set up CI/CD pipeline
- [ ] Configure app store metadata
- [ ] Test on multiple devices and OS versions

## License

MIT License - see LICENSE file for details

## Support

For technical support or questions:
- Create an issue on GitHub
- Email: support@kisanmitra.com
- Documentation: https://docs.kisanmitra.com