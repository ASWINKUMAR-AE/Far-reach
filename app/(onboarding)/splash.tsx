import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { t } = useTranslation();
  
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(iconRotation, {
          toValue: 10,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: -5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/(onboarding)/welcome');
    }, 2500);

    return () => clearTimeout(timer);
  }, [scale, opacity, iconRotation, progressWidth, textOpacity]);

  const spin = iconRotation.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  const animatedStyle = {
    transform: [{ scale }, { rotate: spin }],
    opacity,
  };

  const progressStyle = {
    width: progressWidth.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
  };

  const textStyle = {
    opacity: textOpacity,
  };

  return (
    <View style={styles.container}>
      {/* Background with gradient effect */}
      <View style={styles.background}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>
      
      {/* Animated content */}
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Animated.View style={animatedStyle}>
              <View style={styles.logo}>
                <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
            </Animated.View>
          </View>
          
          {/* Decorative elements */}
          <View style={styles.decoration}>
            <View style={[styles.decorationItem, styles.decoration1]} />
            <View style={[styles.decorationItem, styles.decoration2]} />
            <View style={[styles.decorationItem, styles.decoration3]} />
          </View>
        </View>
        
        <Animated.View style={textStyle}>
          <Text style={styles.appName}>
            {t('app.name')}
          </Text>
          
          <Text style={styles.tagline}>
            {t('app.tagline')}
          </Text>
        </Animated.View>
        
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressForeground, progressStyle]} />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, textStyle]}>
        <Text style={styles.poweredBy}>
          {t('common.poweredBy')} <Text style={styles.aiText}>AE</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#34a853', // primary green
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  logoBackground: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  decoration: {
    position: 'absolute',
    width: 180,
    height: 180,
  },
  decorationItem: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
  },
  decoration1: {
    top: 0,
    right: 0,
    width: 20,
    height: 20,
  },
  decoration2: {
    bottom: 10,
    left: 0,
    width: 16,
    height: 16,
  },
  decoration3: {
    bottom: 40,
    right: 20,
    width: 12,
    height: 12,
  },
  appName: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: 120,
    marginTop: 24,
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressForeground: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  poweredBy: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  aiText: {
    fontWeight: '600',
  },
});