import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft, Ticket, Users, Scale, CreditCard } from 'lucide-react-native';
import { router } from 'expo-router';
import { getNotifications } from '@/lib/procurementService';
import { FarReachNotification } from '@/lib/types';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<FarReachNotification[]>([]);

  useEffect(() => {
    async function load() {
      const list = await getNotifications();
      setNotifications(list);
    }
    load();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SLOT': return <Ticket size={18} color="#166534" />;
      case 'QUEUE': return <Users size={18} color="#F59E0B" />;
      case 'WEIGHING': return <Scale size={18} color="#059669" />;
      case 'PAYMENT': return <CreditCard size={18} color="#22C55E" />;
      default: return <Bell size={18} color="#166534" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Notifications</Text>
        </View>

        <View style={styles.list}>
          {notifications.map((item) => (
            <View key={item.id} style={[styles.itemCard, !item.read && styles.unreadCard]}>
              <View style={styles.iconCircle}>
                {getIcon(item.type)}
              </View>
              <View style={styles.contentFlex}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemTime}>{item.timestamp}</Text>
                </View>
                <Text style={styles.itemMessage}>{item.message}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF5' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#166534' },
  list: { gap: 12 },
  itemCard: { flexDirection: 'row', backgroundColor: 'white', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  unreadCard: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  contentFlex: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemTime: { fontSize: 11, color: '#64748B' },
  itemMessage: { fontSize: 13, color: '#334155', lineHeight: 18 },
});
