import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TestTubes, Sprout, TrendingUp } from 'lucide-react-native';
import { Card } from '../ui/Card';

const recentActivities = [
  {
    icon: TestTubes,
    titleKey: 'activity.soilTest',
    time: '2 hours ago',
    color: '#3b82f6', // blue-500
  },
  {
    icon: Sprout,
    titleKey: 'activity.cropRecommendation',
    time: '1 day ago',
    color: '#34a853', // primary-500
  },
  {
    icon: TrendingUp,
    titleKey: 'activity.marketPrice',
    time: '2 days ago',
    color: '#f59e0b', // secondary-500
  },
];

export function RecentActivity() {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.activitiesContainer}>
        {recentActivities.map((activity, index) => {
          const IconComponent = activity.icon;
          return (
            <View key={index} style={styles.activityItem}>
              <View style={[styles.iconContainer, { backgroundColor: activity.color }]}>
                <IconComponent size={20} color="white" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.activityTitle}>
                  {t(activity.titleKey)}
                </Text>
                <Text style={styles.activityTime}>
                  {activity.time}
                </Text>
              </View>
              {index < recentActivities.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.8,
    elevation: 5,
  },
  activitiesContainer: {
    gap: 0,
  },
  activityItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  activityTitle: {
    color: '#2d3b2d', // earth-900
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityTime: {
    color: '#6b776b', // earth-500
    fontSize: 14,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 60, // icon width + margin
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});