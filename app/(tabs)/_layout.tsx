import { Tabs } from 'expo-router';
import {
  Hop as Home,
  TrendingUp,
  Building2,
  Users,
  CreditCard,
  Newspaper,
} from 'lucide-react-native';

import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import React, { useEffect } from 'react';

const CustomTabBarIcon = ({ icon, focused }: { icon: any; focused: boolean }) => {
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
    </Animated.View>
  );
};

export default function TabLayout() {
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
              icon={<Home size={22} color={focused ? '#ffffff' : '#059669'} />}
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
              icon={<Building2 size={22} color={focused ? '#ffffff' : '#059669'} />}
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
              icon={<Users size={22} color={focused ? '#ffffff' : '#059669'} />}
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
              icon={<CreditCard size={22} color={focused ? '#ffffff' : '#059669'} />}
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
              icon={<TrendingUp size={22} color={focused ? '#ffffff' : '#059669'} />}
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
              icon={<Newspaper size={22} color={focused ? '#ffffff' : '#059669'} />}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="CropScanner"
        options={{
          href: null,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: -25,
  },
  tabIconFocused: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
