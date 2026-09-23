import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { 
  Gesture, 
  GestureDetector, 
} from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withRepeat,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
  useAnimatedReaction
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { 
  Mic, 
  Repeat, 
  Globe, 
  Leaf, 
  CloudSun, 
  Bug, 
  TestTubes, 
  Building2,
  Sparkles,
  Info
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 70;
const RADIAL_RADIUS = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35; 
const LONG_PRESS_DURATION = 400;

const OPTIONS = [
  { id: 'voice_chat', icon: Mic, label: 'Voice Chat', route: '/chat-assistant', color: '#38BDF8' },
  { id: 'crop_rotation', icon: Repeat, label: 'Crop Rotation', route: '/(tabs)/Crop_rotation', color: '#10B981' },
  { id: 'fertilizer', icon: Leaf, label: 'Fertilizer', route: '/fertilizer-advisor', color: '#84CC16' },
  { id: 'soil_test', icon: TestTubes, label: 'Soil Test', route: '/soil-input', color: '#A855F7' },
];

export default function RadialAIAssistant() {
  const router = useRouter();
  const { i18n } = useTranslation();
  
  // State for Bubble
  const [bubbleMessage, setBubbleMessage] = useState<{title: string, message: string, color: string} | null>(null);
  
  // Shared Values for Animations
  const menuOpen = useSharedValue(0);
  const coreScale = useSharedValue(1);
  const coreGlow = useSharedValue(0.5);
  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const activeSectorIndex = useSharedValue(-1);
  const buttonX = useSharedValue(SCREEN_WIDTH / 2 - 40);
  const buttonY = useSharedValue(0);
  const offsetX = useSharedValue(SCREEN_WIDTH / 2 - 40);
  const offsetY = useSharedValue(0);
  const isMovable = useSharedValue(false);

  // Breathing Animation for Idle state
  useEffect(() => {
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
    coreGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const triggerBubble = (title: string, message: string, color: string) => {
    setBubbleMessage({ title, message, color });
    setTimeout(() => {
      setBubbleMessage(null);
    }, 6000);
  };

  const handleAction = useCallback((optionId: string) => {
    const option = OPTIONS.find(o => o.id === optionId);
    if (!option) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    
    if (option.route) {
      router.push(option.route as any);
    }
  }, [router, i18n]);

  // Gesture handling
  const longPressGesture = Gesture.LongPress()
    .minDuration(3000)
    .onStart(() => {
      isMovable.value = true;
      menuOpen.value = withSpring(0);
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
    });

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DURATION)
    .onStart(() => {
      if (!isMovable.value) {
        menuOpen.value = withSpring(1, { damping: 15, stiffness: 120 });
        coreScale.value = withSpring(0.9);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        
        pointerX.value = 0;
        pointerY.value = 0;
        activeSectorIndex.value = -1;
      }
    })
    .onUpdate((e) => {
      if (isMovable.value) {
        buttonX.value = offsetX.value + e.translationX;
        buttonY.value = offsetY.value + e.translationY;
      } else {
        pointerX.value = e.translationX;
        pointerY.value = e.translationY;
        
        const distance = Math.sqrt(e.translationX * e.translationX + e.translationY * e.translationY);
        
        if (distance > 40) {
          let rawAngle = Math.atan2(e.translationY, e.translationX);
          let angle360 = rawAngle;
          if (angle360 < 0) angle360 += 2 * Math.PI;
          
          let index = -1;
          
          if (buttonX.value > SCREEN_WIDTH / 4) {
             if (angle360 < Math.PI/2 || angle360 > 3*Math.PI/2) {
               index = angle360 < Math.PI/2 ? 0 : OPTIONS.length - 1;
             } else {
               index = Math.round(((angle360 - Math.PI/2) / Math.PI) * (OPTIONS.length - 1));
             }
          } else if (buttonX.value < -SCREEN_WIDTH / 4) {
             if (rawAngle > Math.PI/2 || rawAngle < -Math.PI/2) {
               index = rawAngle > 0 ? OPTIONS.length - 1 : 0;
             } else {
               index = Math.round(((rawAngle + Math.PI/2) / Math.PI) * (OPTIONS.length - 1));
             }
          } else {
             let a = angle360 + Math.PI / 2;
             if (a >= 2 * Math.PI) a -= 2 * Math.PI;
             const sectorSize = (2 * Math.PI) / OPTIONS.length;
             index = Math.round(a / sectorSize) % OPTIONS.length;
          }
          
          if (activeSectorIndex.value !== index && index >= 0 && index < OPTIONS.length) {
            activeSectorIndex.value = index;
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          }
        } else {
          if (activeSectorIndex.value !== -1) {
            activeSectorIndex.value = -1;
          }
        }
      }
    })
    .onEnd(() => {
      if (isMovable.value) {
        offsetX.value = buttonX.value;
        offsetY.value = buttonY.value;
        isMovable.value = false;
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      } else {
        if (activeSectorIndex.value !== -1) {
          const selected = OPTIONS[activeSectorIndex.value].id;
          runOnJS(handleAction)(selected);
        }
        
        menuOpen.value = withSpring(0, { damping: 12, stiffness: 150 });
        coreScale.value = withSpring(1);
        activeSectorIndex.value = -1;
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(handleAction)('voice_chat');
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture, longPressGesture);

  // Styles
  const coreAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: coreScale.value }],
      shadowOpacity: coreGlow.value,
      shadowRadius: interpolate(coreGlow.value, [0.4, 0.8], [10, 20]),
    };
  });

  const bgOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(menuOpen.value, [0, 1], [0, 0.85]),
      pointerEvents: menuOpen.value > 0.1 ? 'auto' : 'none',
    };
  });

  const wrapperStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: buttonX.value },
        { translateY: buttonY.value }
      ]
    };
  });

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, bgOverlayStyle]} pointerEvents="none" />
      
      {/* Bubble Message */}
      {bubbleMessage && (
        <Animated.View style={[styles.bubbleContainer, { borderLeftColor: bubbleMessage.color }]}>
          <Info color={bubbleMessage.color} size={24} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.bubbleTitle, { color: bubbleMessage.color }]}>{bubbleMessage.title}</Text>
            <Text style={styles.bubbleText}>{bubbleMessage.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* Main UI */}
      <View style={styles.container} pointerEvents="box-none">
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.coreWrapper, wrapperStyle]} pointerEvents="box-none">
            
            {/* Radial Options */}
            {OPTIONS.map((option, index) => {
              const optionStyle = useAnimatedStyle(() => {
                const isActive = activeSectorIndex.value === index;
                const distance = interpolate(menuOpen.value, [0, 1], [0, RADIAL_RADIUS], Extrapolation.CLAMP);
                const scale = interpolate(menuOpen.value, [0, 1], [0, isActive ? 1.25 : 1], Extrapolation.CLAMP);
                const opacity = interpolate(menuOpen.value, [0, 0.5, 1], [0, 0, isActive ? 1 : 0.6]);
                
                let angle = 0;
                if (buttonX.value > SCREEN_WIDTH / 4) {
                   angle = Math.PI / 2 + (index * Math.PI) / (OPTIONS.length - 1);
                } else if (buttonX.value < -SCREEN_WIDTH / 4) {
                   angle = -Math.PI / 2 + (index * Math.PI) / (OPTIONS.length - 1);
                } else {
                   angle = (index * (Math.PI * 2)) / OPTIONS.length - Math.PI / 2;
                }

                return {
                  opacity,
                  transform: [
                    { translateX: Math.cos(angle) * distance },
                    { translateY: Math.sin(angle) * distance },
                    { scale },
                  ],
                };
              });

              return (
                <Animated.View key={option.id} style={[styles.optionContainer, optionStyle]}>
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20', borderColor: option.color }]}>
                    <option.icon size={24} color={option.color} />
                  </View>
                  <Text style={[styles.optionLabel, { color: option.color }]}>{option.label}</Text>
                </Animated.View>
              );
            })}

            {/* AI Core Button */}
            <Animated.View style={[styles.coreButton, coreAnimatedStyle]}>
              <Sparkles color="#A7F3D0" size={32} />
              <View style={styles.coreInnerGlow} />
            </Animated.View>

          </Animated.View>
        </GestureDetector>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: '#022c22',
    zIndex: 999,
  },
  container: {
    ...StyleSheet.absoluteFillObject as any,
    zIndex: 1000,
    elevation: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coreWrapper: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coreButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    zIndex: 10,
    elevation: 10,
  },
  coreInnerGlow: {
    ...StyleSheet.absoluteFill as any,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#10B981',
    opacity: 0.2,
  },
  optionContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    zIndex: 5,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: '#1E293B',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bubbleContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  bubbleTitle: {
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  bubbleText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  }
});
