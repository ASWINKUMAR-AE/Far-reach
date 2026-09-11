import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Leaf, TrendingUp, MessageCircle, Camera } from 'lucide-react-native';

const features = [
  {
    icon: Leaf,
    titleKey: 'onboarding.features.soil.title',
    descKey: 'onboarding.features.soil.desc',
  },
  {
    icon: TrendingUp,
    titleKey: 'onboarding.features.market.title', 
    descKey: 'onboarding.features.market.desc',
  },
  {
    icon: MessageCircle,
    titleKey: 'onboarding.features.assistant.title',
    descKey: 'onboarding.features.assistant.desc',
  },
  {
    icon: Camera,
    titleKey: 'onboarding.features.visual.title',
    descKey: 'onboarding.features.visual.desc',
  },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          
          <Text style={styles.title}>
            {t('onboarding.welcome.title')}
          </Text>
          
          <Text style={styles.subtitle}>
            {t('onboarding.welcome.subtitle')}
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={index} style={styles.featureCard}>
                <View style={styles.iconContainer}>
                  <IconComponent size={24} color="white" />
                </View>
                
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>
                    {t(feature.titleKey)}
                  </Text>
                  <Text style={styles.featureDesc}>
                    {t(feature.descKey)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
             onPress={() => router.replace('/(tabs)')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {t('auth.skipForNow')} 
          </Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {t('auth.skipForNow')}
          </Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#34a853', // primary green color
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  title: {
    color: '#2d3b2d', // earth-900
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b776b', // earth-600
    fontSize: 16,
    textAlign: 'center',
  },
  featuresContainer: {
    gap: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ea', // primary-50
    padding: 16,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#34a853', // primary-500
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: '#2d3b2d', // earth-900
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  featureDesc: {
    color: '#6b776b', // earth-600
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  primaryButton: {
    backgroundColor: '#34a853', // primary-500
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: '#6b776b', // earth-600
    textAlign: 'center',
    fontSize: 16,
  },
});