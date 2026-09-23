import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Hop as Home,
  MapPin,
  TrendingUp,
  Leaf,
  Building2,
  Users,
  CreditCard,
  Newspaper,
} from 'lucide-react-native';

import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import React, { useEffect } from 'react';

const CustomTabBarIcon = ({ icon, label, focused }: { icon: any; label: string; focused: boolean }) => {
  const scale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 12, stiffness: 150 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.tabIconContainer,
        focused && styles.tabIconFocused,
        animatedStyle,
      ]}
    >
      {icon}
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </Animated.View>
  );
};

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<Home size={20} color={focused ? '#ffffff' : '#059669'} />}
              label={t('navigation.home')}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="procurement"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<Building2 size={20} color={focused ? '#ffffff' : '#059669'} />}
              label="Procure"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<Users size={20} color={focused ? '#ffffff' : '#059669'} />}
              label="Queue"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<CreditCard size={20} color={focused ? '#ffffff' : '#059669'} />}
              label="Pay"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<TrendingUp size={20} color={focused ? '#ffffff' : '#059669'} />}
              label={t('navigation.market')}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<Newspaper size={20} color={focused ? '#ffffff' : '#059669'} />}
              label="Updates"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="CropScanner"
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon
              icon={<Leaf size={20} color={focused ? '#ffffff' : '#059669'} />}
              label={t('Scanner')}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fields"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Crop_rotation"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginHorizontal: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.1)',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  tabIconFocused: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  tabLabelFocused: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
