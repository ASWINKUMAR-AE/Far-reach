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
} from 'lucide-react-native';

import { View, Text, StyleSheet, Animated } from 'react-native';

const CustomTabBarIcon = ({ icon, label, focused }: { icon: any; label: string; focused: boolean }) => {
  const scale = new Animated.Value(focused ? 1.1 : 1);

  Animated.spring(scale, {
    toValue: focused ? 1.1 : 1,
    useNativeDriver: true,
    friction: 4,
  }).start();

  return (
    <Animated.View
      style={[
        styles.tabIconContainer,
        focused && styles.tabIconFocused,
        { transform: [{ scale }] },
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
    bottom: 16,
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0fdf4',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginHorizontal: 10,
    elevation: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    bottom: 14,
    height: 50,
    borderRadius: 25,
  },
  tabIconFocused: {
    backgroundColor: '#059669',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#84cc16',
    marginTop: 2,
  },
  tabLabelFocused: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
