import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Sun, Droplets, Wind, Eye, AlertCircle } from 'lucide-react-native';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
}

export function WeatherCard() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>(''); // City name

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(t('weather.locationPermission'));
          setLoading(false);
          return;
        }

        // Get current location with timeout and fallback
        let latitude = 10.7905;
        let longitude = 78.7047;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        } catch (locErr) {
          console.warn("Location fetch timeout, using fallback Tiruchirappalli coordinates.", locErr);
        }

        // Optional: get city name
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverseGeocode && reverseGeocode.length > 0 && reverseGeocode[0].city) {
            setLocationName(`${reverseGeocode[0].city}, ${reverseGeocode[0].country || 'India'}`);
          } else {
            setLocationName('Tiruchirappalli, Tamil Nadu');
          }
        } catch (geoErr) {
          setLocationName('Tiruchirappalli, Tamil Nadu');
        }

        // Fetch weather data from Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,visibility,windspeed_10m`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.current_weather) {
          setWeather({
            temperature: Math.round(data.current_weather.temperature),
            windSpeed: Math.round(data.current_weather.windspeed),
            humidity: data.hourly?.relative_humidity_2m
              ? Math.round(data.hourly.relative_humidity_2m[0])
              : 0,
            visibility: data.hourly?.visibility
              ? Math.round(data.hourly.visibility[0] / 1000)
              : 0,
          });
        } else {
          setError(t('weather.error'));
        }
      } catch (e) {
        console.error(e);
        setError(t('weather.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [t]);

  if (loading) {
    return (
      <View style={[styles.card, styles.centered]}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t('weather.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.centered]}>
        <AlertCircle size={32} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#059669', '#10b981', '#34d399']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('weather.today')}</Text>
          <Text style={styles.location}>{locationName}</Text>
        </View>
        <View style={styles.temperatureContainer}>
          <Sun size={32} color="#FDE047" />
          <Text style={styles.temperature}>{weather?.temperature}°C</Text>
        </View>
      </View>

      <View style={styles.weatherDetails}>
        <View style={styles.weatherItem}>
          <View style={[styles.iconContainer, styles.humidityIcon]}>
            <Droplets size={16} color="#BAE6FD" />
          </View>
          <Text style={styles.value}>{weather?.humidity}%</Text>
          <Text style={styles.label}>{t('weather.humidity')}</Text>
        </View>

        <View style={styles.weatherItem}>
          <View style={[styles.iconContainer, styles.windIcon]}>
            <Wind size={16} color="#E2E8F0" />
          </View>
          <Text style={styles.value}>{weather?.windSpeed} km/h</Text>
          <Text style={styles.label}>{t('weather.wind')}</Text>
        </View>

        <View style={styles.weatherItem}>
          <View style={[styles.iconContainer, styles.visibilityIcon]}>
            <Eye size={16} color="#DDD6FE" />
          </View>
          <Text style={styles.value}>{weather?.visibility} km</Text>
          <Text style={styles.label}>{t('weather.visibility')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#059669',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 180,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#059669',
    fontSize: 16,
  },
  errorText: {
    marginTop: 10,
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  location: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  temperatureContainer: {
    alignItems: 'center',
  },
  temperature: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  humidityIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  windIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  visibilityIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  value: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
