import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
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

        // Get current location
        const loc = await Location.getCurrentPositionAsync({});
        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;

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
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('weather.today')}</Text>
          <Text style={styles.location}>{locationName}</Text>
        </View>
        <View style={styles.temperatureContainer}>
          <Sun size={32} color="#F59E0B" />
          <Text style={styles.temperature}>{weather?.temperature}°C</Text>
        </View>
      </View>

      <View style={styles.weatherDetails}>
        <View style={styles.weatherItem}>
          <View style={[styles.iconContainer, styles.humidityIcon]}>
            <Droplets size={16} color="#3B82F6" />
          </View>
          <Text style={styles.value}>{weather?.humidity}%</Text>
          <Text style={styles.label}>{t('weather.humidity')}</Text>
        </View>

        <View style={styles.weatherItem}>
          <View style={[styles.iconContainer, styles.windIcon]}>
            <Wind size={16} color="#6B7280" />
          </View>
          <Text style={styles.value}>{weather?.windSpeed} km/h</Text>
          <Text style={styles.label}>{t('weather.wind')}</Text>
        </View>

        <View style={styles.weatherItem}>
          <View style={[styles.iconContainer, styles.visibilityIcon]}>
            <Eye size={16} color="#8B5CF6" />
          </View>
          <Text style={styles.value}>{weather?.visibility} km</Text>
          <Text style={styles.label}>{t('weather.visibility')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3.8,
    elevation: 5,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
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
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    color: '#2d3b2d',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  location: {
    color: '#6b776b',
    fontSize: 14,
  },
  temperatureContainer: {
    alignItems: 'center',
  },
  temperature: {
    color: '#2d3b2d',
    fontSize: 24,
    fontWeight: 'bold',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  humidityIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  windIcon: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  visibilityIcon: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  value: {
    color: '#2d3b2d',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  label: {
    color: '#6b776b',
    fontSize: 12,
  },
});
