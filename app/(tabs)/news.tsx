import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Linking, StyleSheet } from 'react-native';
import { io } from 'socket.io-client';
import { fetchNews, fetchLiveNews } from '../../lib/apiClient';
import { Newspaper, BellRing, MapPin, CheckCircle, ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  source_name: string;
  source_url: string;
  published_at: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  is_verified: boolean;
}

const SOCKET_URL = process.env.EXPO_PUBLIC_NEWS_SOCKET_URL || 'http://localhost:3000';

export default function NewsFeedScreen() {
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [offline, setOffline] = useState(false);

  const categories = ['ALL', 'PROCUREMENT', 'GOVERNMENT_SCHEME', 'WEATHER', 'AGRICULTURE_NEWS'];

  const loadNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const query = filter === 'ALL' ? {} : { category: filter };
      const res = await fetchNews(query);
      
      if (res?.data) {
        setNews(res.data);
        await AsyncStorage.setItem('cached_news', JSON.stringify(res.data));
        setOffline(false);
      }
    } catch (e) {
      console.warn(e);
      setOffline(true);
      const cached = await AsyncStorage.getItem('cached_news');
      if (cached) setNews(JSON.parse(cached));
    } finally {
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNews();

    const socket = io(SOCKET_URL);
    
    socket.on('NEW_UPDATE', (newItem: NewsItem) => {
      if (filter === 'ALL' || newItem.category === filter) {
        setNews(prev => [newItem, ...prev]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loadNews, filter]);

  const renderItem = ({ item }: { item: NewsItem }) => {
    let borderColor = '#e5e7eb';
    let bgColor = '#ffffff';
    let tagColor = '#f3f4f6';
    let tagTextColor = '#374151';

    if (item.priority === 'CRITICAL') {
      borderColor = '#ef4444';
      bgColor = '#fef2f2';
      tagColor = '#ef4444';
      tagTextColor = '#ffffff';
    } else if (item.priority === 'HIGH') {
      borderColor = '#fb923c';
      tagColor = '#fb923c';
      tagTextColor = '#ffffff';
    } else if (item.category === 'WEATHER') {
      borderColor = '#60a5fa';
      tagColor = '#60a5fa';
      tagTextColor = '#ffffff';
    }

    const isLive = new Date().getTime() - new Date(item.published_at).getTime() < 3600000;

    return (
      <TouchableOpacity 
        style={[styles.card, { borderColor, backgroundColor: bgColor }]}
        onPress={() => item.source_url ? Linking.openURL(item.source_url) : null}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.tag, { backgroundColor: tagColor }]}>
              <Text style={[styles.tagText, { color: tagTextColor }]}>
                {item.category.replace(/_/g, ' ')}
              </Text>
            </View>
            {isLive && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>
            {new Date(item.published_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary} numberOfLines={3}>{item.summary}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.sourceInfo}>
            {item.is_verified ? (
              <CheckCircle size={14} color="#059669" />
            ) : (
              <MapPin size={14} color="#9CA3AF" />
            )}
            <Text style={styles.sourceText}>
              {item.source_name} {item.location ? `• ${item.location}` : ''}
            </Text>
          </View>
          
          {item.source_url && (
            <View style={styles.readMore}>
              <Text style={styles.readMoreText}>Read Source</Text>
              <ExternalLink size={12} color="#2563EB" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Newspaper color="#16A34A" size={24} />
          <Text style={styles.headerTitle}>Live Updates</Text>
        </View>
        <TouchableOpacity>
          <BellRing color="#4B5563" size={20} />
        </TouchableOpacity>
      </View>

      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline. Showing cached news.</Text>
        </View>
      )}

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = filter === item;
            return (
              <TouchableOpacity 
                onPress={() => setFilter(item)}
                style={[
                  styles.filterBtn, 
                  isActive ? styles.filterBtnActive : styles.filterBtnInactive
                ]}
              >
                <Text style={isActive ? styles.filterTextActive : styles.filterTextInactive}>
                  {item.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={news}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNews(true)} tintColor="#16A34A" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Newspaper color="#D1D5DB" size={48} />
            <Text style={styles.emptyText}>No updates found for this category.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 8 },
  offlineBanner: { backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  offlineText: { color: '#92400e', fontSize: 12, fontWeight: '500' },
  filterContainer: { backgroundColor: '#ffffff', paddingVertical: 12 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1,
    marginRight: 8
  },
  filterBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterBtnInactive: { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  filterTextActive: { color: '#ffffff', fontWeight: '500' },
  filterTextInactive: { color: '#4b5563', fontWeight: '500' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 }, // Padding bottom for tabs
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: '#9ca3af', marginTop: 16, fontWeight: '500', fontSize: 16 },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  tagText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#15803d', marginLeft: 4 },
  dateText: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  summary: { fontSize: 14, color: '#4b5563', marginBottom: 16, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 8 },
  sourceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceText: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginLeft: 4 },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreText: { fontSize: 12, color: '#2563eb', fontWeight: '500', marginRight: 4 },
});
