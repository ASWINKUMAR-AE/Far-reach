import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from "expo-speech";
import { 
  TestTubes, 
  Sprout, 
  TrendingUp, 
  MessageCircle,
  Sun,
  Wheat,
  Repeat,
  Bell,
  QrCode,
  HelpCircle
} from 'lucide-react-native';
import { WeatherCard } from '@/components/home/WeatherCard';
import { RecentActivity } from '@/components/home/RecentActivity';

const { width } = Dimensions.get('window');

const quickActions = [
  {
    icon: QrCode,
    titleKey: 'Self Check-in',
    route: '/checkin',
    color: '#166534',
  },
  {
    icon: Bell,
    titleKey: 'Notifications',
    route: '/notifications',
    color: '#166534',
  },
  {
    icon: HelpCircle,
    titleKey: 'Help & Support',
    route: '/help',
    color: '#166534',
  },
  {
    icon: TestTubes,
    titleKey: 'home.actions.soilTest',
    route: '/soil-input',
     color: '#059669',
  },
    {
    icon: TestTubes,
    titleKey: 'Crop Scanner',
    route: '/CropScanner',
    color: '#059669',
  },
  {
    icon: Sprout,
    titleKey: 'home.actions.cropSuggestions',
    route: '/crop-recommendations',
    color: '#059669',
  },
  {
    icon: TrendingUp,
    titleKey: 'home.actions.marketTrends',
    route: '/market',
   color: '#059669',
  },
  {
    icon: MessageCircle,
    titleKey: 'home.actions.assistant',
    route: '/chat-assistant',
    color: '#059669',
  },

{
  icon: Repeat,
  titleKey: 'Crop Rotation',
  route: '/Crop_rotation',
  color: '#059669',
}
];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState("en");

  const changeLanguage = (lang: string) => {
    setSelectedLang(lang);
    i18n.changeLanguage(lang);

    let message = "";
    if (lang === "en") {
      message = "Welcome to the Smart Farming App!";
    } else if (lang === "hi") {
      message = "स्मार्ट खेती ऐप में आपका स्वागत है!";
    } else if (lang === "ta") {
      message = "ஸ்மார்ட் விவசாய பயன்பாட்டிற்கு வரவேற்கிறோம்!";
    }

    Speech.speak(message, { language: lang === "en" ? "en-US" : lang === "hi" ? "hi-IN" : "ta-IN" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Background decorative elements */}
        <View style={styles.backgroundIcon1}>
          <Sun size={200} color="#059669" />
        </View>
        <View style={styles.backgroundIcon2}>
          <Wheat size={180} color="#059669" />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                {t('home.greeting')}
              </Text>
              <Text style={styles.subtitle}>
                {t('home.subtitle')}
              </Text>
            </View>
            <Image source={require('../../assets/icon.png')} style={{ width: 52, height: 52, borderRadius: 14, marginLeft: 12 }} resizeMode="contain" />
          </View>

          {/* Translation Buttons */}
          <View style={styles.languageContainer}>
            <TouchableOpacity 
              style={[styles.langButton, selectedLang === "en" && styles.langButtonActive]} 
              onPress={() => changeLanguage("en")}
            >
              <Text style={styles.langText}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.langButton, selectedLang === "hi" && styles.langButtonActive]} 
              onPress={() => changeLanguage("hi")}
            >
              <Text style={styles.langText}>हिन्दी</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.langButton, selectedLang === "ta" && styles.langButtonActive]} 
              onPress={() => changeLanguage("ta")}
            >
              <Text style={styles.langText}>தமிழ்</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weather Card */}
        <View style={styles.section}>
          <WeatherCard />
        </View>

        {/* FAR REACH — Today's Procurement Card */}
        <View style={styles.section}>
          <View style={styles.procurementHeroCard}>
            <View style={styles.procurementHeader}>
              <View>
                <Text style={styles.procurementTag}>FAR REACH PROCUREMENT</Text>
                <Text style={styles.procurementCentreTitle}>Samayapuram Centre</Text>
              </View>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenBadgeText}>Token #147</Text>
              </View>
            </View>

            <View style={styles.procurementDetailsGrid}>
              <View style={styles.pDetailBox}>
                <Text style={styles.pDetailLabel}>SLOT</Text>
                <Text style={styles.pDetailVal}>10:30 AM</Text>
              </View>
              <View style={styles.pDetailBox}>
                <Text style={styles.pDetailLabel}>QUEUE AHEAD</Text>
                <Text style={styles.pDetailVal}>15 Farmers</Text>
              </View>
              <View style={styles.pDetailBox}>
                <Text style={styles.pDetailLabel}>DYNAMIC ETA</Text>
                <Text style={styles.pDetailVal}>~45 mins</Text>
              </View>
            </View>

            {/* Quick Procurement Action Buttons */}
            <View style={styles.pActionRow}>
              <TouchableOpacity
                style={styles.pBtnPrimary}
                onPress={() => router.push('/(tabs)/queue' as any)}
              >
                <Text style={styles.pBtnPrimaryText}>LIVE QUEUE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pBtnSecondary}
                onPress={() => router.push('/(tabs)/procurement' as any)}
              >
                <Text style={styles.pBtnSecondaryText}>BOOK SLOT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pBtnSecondary}
                onPress={() => router.push('/(tabs)/payments' as any)}
              >
                <Text style={styles.pBtnSecondaryText}>PAYMENTS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('home.quickActions')}
          </Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => router.push(action.route as any)}
                  style={styles.actionItem}
                >
                  <View style={styles.actionCard}>
                    <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                      <IconComponent size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>
                      {t(action.titleKey)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('home.recentActivity')}
          </Text>
          <RecentActivity />
        </View>

        {/* Farm Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('home.farmStats')}
          </Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#10b981' }]}>5</Text>
                <Text style={styles.statLabel}>
                  {t('home.stats.totalFields')}
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>12.5</Text>
                <Text style={styles.statLabel}>
                  {t('home.stats.totalArea')}
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#059669' }]}>3</Text>
                <Text style={styles.statLabel}>
                  {t('home.stats.activeCrops')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  scrollView: { flex: 1 },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
    marginBottom: 16,
  },
  greeting: {
    color: '#052e16',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: { color: '#059669', fontSize: 16, marginBottom: 12 },
  languageContainer: { flexDirection: 'row', gap: 8 },
  langButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  langButtonActive: { backgroundColor: '#059669' },
  langText: { color: 'white', fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginBottom: 24, position: 'relative', zIndex: 10 },
  sectionTitle: { color: '#052e16', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  actionItem: { width: (width - 40) / 2 - 8, marginHorizontal: 4, marginBottom: 16 },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: { color: '#052e16', fontWeight: '500', fontSize: 14, textAlign: 'center' },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#059669', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#dcfce7' },
  backgroundIcon1: { position: 'absolute', top: 80, left: -20, opacity: 0.05, zIndex: 0 },
  backgroundIcon2: { position: 'absolute', bottom: 160, right: -30, opacity: 0.05, zIndex: 0 },
  procurementHeroCard: {
    backgroundColor: '#0B3D2E',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#166534',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  procurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  procurementTag: { fontSize: 10, fontWeight: '800', color: '#86EFAC', letterSpacing: 1 },
  procurementCentreTitle: { fontSize: 18, fontWeight: '800', color: 'white', marginTop: 2 },
  tokenBadge: { backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tokenBadgeText: { fontSize: 12, fontWeight: '900', color: 'white' },
  procurementDetailsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  pDetailBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  pDetailLabel: { fontSize: 9, fontWeight: '800', color: '#A7F3D0' },
  pDetailVal: { fontSize: 13, fontWeight: '800', color: 'white', marginTop: 2 },
  pActionRow: { flexDirection: 'row', gap: 8 },
  pBtnPrimary: {
    flex: 1.2,
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  pBtnPrimaryText: { color: 'white', fontWeight: '800', fontSize: 12 },
  pBtnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  pBtnSecondaryText: { color: 'white', fontWeight: '700', fontSize: 11 },
});
