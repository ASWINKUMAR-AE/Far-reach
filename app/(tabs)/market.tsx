import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Search,
  MapPin,
  DollarSign,
  Wheat,
} from "lucide-react-native";

const marketDataJson = require("../../assets/market.json");

interface MarketTrend {
  id: string;
  crop: string;
  price: string;
  trend: "up" | "down";
  location: string; // "Market, State"
  change: string;
  rawMarket?: string;
  rawState?: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
];

const uiTranslations: Record<string, Record<string, string>> = {
  title: { en: "Market Trends", hi: "बाज़ार के रुझान", ta: "சந்தை நிலவரம்" },
  subtitle: {
    en: "Latest commodity prices",
    hi: "नवीनतम वस्तु कीमतें",
    ta: "சமீபத்திய பொருட்களின் விலைகள்",
  },
  searchPlaceholder: {
    en: "Search crop or location...",
    hi: "फसल या स्थान खोजें...",
    ta: "பயிர் அல்லது இடத்தை தேடுங்கள்...",
  },
  noResults: {
    en: "No results found.",
    hi: "कोई परिणाम नहीं मिला।",
    ta: "முடிவுகள் எதுவும் இல்லை.",
  },
};

// crop translations
const cropTranslations: Record<string, Record<string, string>> = {
  Tomato: { en: "Tomato", hi: "टमाटर", ta: "தக்காளி" },
  Potato: { en: "Potato", hi: "आलू", ta: "உருளைக்கிழங்கு" },
  Onion: { en: "Onion", hi: "प्याज", ta: "வெங்காயம்" },
  Banana: { en: "Banana", hi: "केला", ta: "வாழைப்பழம்" },
  Wheat: { en: "Wheat", hi: "गेहूं", ta: "கோதுமை" },
  Rice: { en: "Rice", hi: "चावल", ta: "அரிசி" },
  Cotton: { en: "Cotton", hi: "कपास", ta: "பருத்தி" },
  Maize: { en: "Maize", hi: "मक्का", ta: "சோளம்" },
  Soybean: { en: "Soybean", hi: "सोयाबीन", ta: "சோயாபீன்" },
  Sugarcane: { en: "Sugarcane", hi: "गन्ना", ta: "கரும்பு" },
  Turmeric: { en: "Turmeric", hi: "हल्दी", ta: "மஞ்சள்" },
  Mustard: { en: "Mustard", hi: "सरसों", ta: "கடுகு" },
  Ginger: { en: "Ginger", hi: "अदरक", ta: "இஞ்சி" },
  Garlic: { en: "Garlic", hi: "लहसुन", ta: "பூண்டு" },
  Chillies: { en: "Chillies", hi: "मिर्च", ta: "மிளகாய்" },
  Cabbage: { en: "Cabbage", hi: "पत्ता गोभी", ta: "முட்டைகோசு" },
  Carrot: { en: "Carrot", hi: "गाजर", ta: "கேரட்" },
  Cauliflower: { en: "Cauliflower", hi: "फूलगोभी", ta: "காலிஃபிளவர்" },
  Brinjal: { en: "Brinjal", hi: "बैंगन", ta: "கத்தரிக்காய்" },
  Lemon: { en: "Lemon", hi: "नींबू", ta: "எலுமிச்சை" },
  Groundnut: { en: "Groundnut", hi: "मूंगफली", ta: "நிலக்கடலை" },
  Sunflower: { en: "Sunflower", hi: "सूरजमुखी", ta: "சூரியகாந்தி" },
  CottonSeed: { en: "Cotton Seed", hi: "कपास बीज", ta: "பருத்தி விதை" },
  Jowar: { en: "Jowar", hi: "ज्वार", ta: "சோளம்" },
  Bajra: { en: "Bajra", hi: "बाजरा", ta: "கம்பு" },
  Ragi: { en: "Ragi", hi: "रागी", ta: "கேழ்வரகு" },
  Peas: { en: "Peas", hi: "मटर", ta: "பட்டாணி" },
  Mango: { en: "Mango", hi: "आम", ta: "மாம்பழம்" },
  Grapes: { en: "Grapes", hi: "अंगूर", ta: "திராட்சை" },
  Apple: { en: "Apple", hi: "सेब", ta: "ஆப்பிள்" },
  Papaya: { en: "Papaya", hi: "पपीता", ta: "பப்பாளி" },
  Coconut: { en: "Coconut", hi: "नारियल", ta: "தேங்காய்" },
  Coffee: { en: "Coffee", hi: "कॉफ़ी", ta: "காபி" },
  Tea: { en: "Tea", hi: "चाय", ta: "தேநீர்" },
  Cardamom: { en: "Cardamom", hi: "इलायची", ta: "ஏலக்காய்" },
  Cashew: { en: "Cashew", hi: "काजू", ta: "முந்திரி" },
  Almond: { en: "Almond", hi: "बादाम", ta: "பாதாம்" },
  Pomegranate: { en: "Pomegranate", hi: "अनार", ta: "மாதுளை" },
  Watermelon: { en: "Watermelon", hi: "तरबूज", ta: "தர்பூசணி" },
  Muskmelon: { en: "Muskmelon", hi: "खरबूजा", ta: "முலாம்பழம்" },
  Jackfruit: { en: "Jackfruit", hi: "कटहल", ta: "பலாப்பழம்" },
};

// State & District Translations (Extended)
const stateTranslations: Record<string, Record<string, string>> = {
  "Tamil Nadu": { en: "Tamil Nadu", hi: "तमिलनाडु", ta: "தமிழ்நாடு" },
  Kerala: { en: "Kerala", hi: "केरल", ta: "கேரளா" },
  Karnataka: { en: "Karnataka", hi: "कर्नाटक", ta: "கர்நாடகா" },
  Maharashtra: { en: "Maharashtra", hi: "महाराष्ट्र", ta: "மகாராஷ்டிரா" },
  Gujarat: { en: "Gujarat", hi: "गुजरात", ta: "குஜராத்" },
  Punjab: { en: "Punjab", hi: "पंजाब", ta: "பஞ்சாப்" },
  Haryana: { en: "Haryana", hi: "हरियाणा", ta: "ஹரியானா" },
  Rajasthan: { en: "Rajasthan", hi: "राजस्थान", ta: "ராஜஸ்தான்" },
  UttarPradesh: { en: "Uttar Pradesh", hi: "उत्तर प्रदेश", ta: "உத்தர பிரதேசம்" },
  Bihar: { en: "Bihar", hi: "बिहार", ta: "பீகார்" },
  Jharkhand: { en: "Jharkhand", hi: "झारखंड", ta: "ஜார்கண்ட்" }, // ✅ Added
};

const districtTranslations: Record<string, Record<string, string>> = {
  // Tamil Nadu (samples)
  Chennai: { en: "Chennai", hi: "चेन्नई", ta: "சென்னை" },
  Coimbatore: { en: "Coimbatore", hi: "कोयंबटूर", ta: "கோயம்புத்தூர்" },
  Madurai: { en: "Madurai", hi: "मदुरै", ta: "மதுரை" },
  Thanjavur: { en: "Thanjavur", hi: "तंजावुर", ta: "தஞ்சாவூர்" },
  Salem: { en: "Salem", hi: "सेलम", ta: "சேலம்" },

  // Maharashtra
  Mumbai: { en: "Mumbai", hi: "मुंबई", ta: "மும்பை" },
  Pune: { en: "Pune", hi: "पुणे", ta: "புனே" },

  // Delhi
  Delhi: { en: "Delhi", hi: "दिल्ली", ta: "டெல்லி" },

  // Rajasthan
  Jaipur: { en: "Jaipur", hi: "जयपुर", ta: "ஜெய்ப்பூர்" },

  // Uttar Pradesh
  Lucknow: { en: "Lucknow", hi: "लखनऊ", ta: "லக்னோ" },

  // Jharkhand (✅ Added few main districts)
  Ranchi: { en: "Ranchi", hi: "रांची", ta: "ராஞ்சி" },
  Jamshedpur: { en: "Jamshedpur", hi: "जमशेदपुर", ta: "ஜம்ஷெட்பூர்" },
  Dhanbad: { en: "Dhanbad", hi: "धनबाद", ta: "தனபாத்" },
  Bokaro: { en: "Bokaro", hi: "बोकारो", ta: "போகாரோ" },
  Hazaribagh: { en: "Hazaribagh", hi: "हजारीबाग", ta: "ஹஜாரிபாக்" },
};


// helper: normalize keys for robust matching
const normalizeKey = (s?: string) =>
  (s || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\w]/g, "");

// generic finder: tries exact, normalized, substring matches
function findTranslation(
  mapping: Record<string, Record<string, string>>,
  raw: string | undefined,
  lang: "en" | "hi" | "ta"
): string {
  if (!raw || raw.trim() === "") return raw || "";
  const rawNorm = normalizeKey(raw);

  // exact match first
  if (mapping[raw]) return mapping[raw][lang] || mapping[raw].en || raw;

  // try normalized equal or substring matches
  for (const k of Object.keys(mapping)) {
    const kn = normalizeKey(k);
    if (kn === rawNorm) return mapping[k][lang] || mapping[k].en || raw;
  }
  for (const k of Object.keys(mapping)) {
    const kn = normalizeKey(k);
    if (rawNorm.includes(kn) || kn.includes(rawNorm)) {
      return mapping[k][lang] || mapping[k].en || raw;
    }
  }

  // fallback to original
  return raw;
}

function translateCrop(cropRaw: string, lang: "en" | "hi" | "ta") {
  // exact key
  if (cropTranslations[cropRaw]) return cropTranslations[cropRaw][lang] || cropRaw;

  // normalized/contains matches
  const rawNorm = normalizeKey(cropRaw);
  for (const k of Object.keys(cropTranslations)) {
    const kn = normalizeKey(k);
    if (kn === rawNorm || kn.includes(rawNorm) || rawNorm.includes(kn)) {
      return cropTranslations[k][lang] || cropTranslations[k].en || cropRaw;
    }
  }
  return cropRaw;
}

function translateLocation(locationRaw: string, lang: "en" | "hi" | "ta") {
  if (!locationRaw) return "";
  const parts = locationRaw.split(",").map((p) => p.trim());
  if (parts.length === 0) return locationRaw;

  const stateRaw = parts[parts.length - 1];
  const marketRaw = parts.slice(0, parts.length - 1).join(", ") || "";

  const translatedState = findTranslation(stateTranslations, stateRaw, lang);
  const translatedMarket = findTranslation(districtTranslations, marketRaw, lang);

  if (translatedMarket && translatedState) return `${translatedMarket}, ${translatedState}`;
  if (translatedState) return translatedState;
  if (translatedMarket) return translatedMarket;
  return locationRaw;
}

export default function MarketTrendsScreen() {
  const [searchText, setSearchText] = useState("");
  const [originalData, setOriginalData] = useState<MarketTrend[]>([]);
  const [filteredData, setFilteredData] = useState<MarketTrend[]>([]);
  const [selectedLang, setSelectedLang] = useState<"en" | "hi" | "ta">("en");

  useEffect(() => {
    // transform raw JSON into consistent dataset
    const transformedData: MarketTrend[] = (marketDataJson.records || []).map(
      (item: any, index: number) => {
        const modal = Number(item.modal_price) || 0;
        const min = Number(item.min_price) || 0;
        const max = Number(item.max_price) || 0;
      const market = "";

        const state = item.state ? String(item.state).trim() : "";
const location = state || "";


        return {
          id: String(index),
          crop: item.commodity || "",
          price: `₹${modal}/quintal`,
          trend: modal >= min ? "up" : "down",
          location,
          change: `₹${Math.abs(max - min)}`,
          rawMarket: market,
          rawState: state,
        };
      }
    );
    setOriginalData(transformedData);
    setFilteredData(transformedData);
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);

    if (!text || text.trim() === "") {
      setFilteredData(originalData);
      return;
    }

    const q = text.trim().toUpperCase();

    const newData = originalData.filter((item) => {
      const translatedCrop = translateCrop(item.crop, selectedLang);
      const translatedLocation = translateLocation(
        item.rawMarket ? `${item.rawMarket}, ${item.rawState}` : item.location,
        selectedLang
      );

      // build searchable string: include both translated and raw forms
      const searchable = `${(translatedCrop || "")
        .toString()
        .toUpperCase()} ${(translatedLocation || "").toString().toUpperCase()} ${(item.crop || "")
        .toString()
        .toUpperCase()} ${(item.location || "").toString().toUpperCase()}`;

      return searchable.includes(q);
    });

    setFilteredData(newData);
  };

  const speakItem = (item: MarketTrend) => {
    const cropName = translateCrop(item.crop, selectedLang);
    const locationName = translateLocation(
      item.rawMarket ? `${item.rawMarket}, ${item.rawState}` : item.location,
      selectedLang
    );

    const text = `${cropName}, Price: ${item.price}, Location: ${locationName}`;
    let languageCode: string = selectedLang;
    if (selectedLang === "hi") languageCode = "hi-IN";
    if (selectedLang === "ta") languageCode = "ta-IN";
    Speech.speak(text, { language: languageCode });
  };

  const renderTrendItem = ({ item }: { item: MarketTrend }) => {
    const translatedCrop = translateCrop(item.crop, selectedLang);
    const translatedLocation = translateLocation(
      item.rawMarket ? `${item.rawMarket}, ${item.rawState}` : item.location,
      selectedLang
    );

    return (
      <TouchableOpacity onPress={() => speakItem(item)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cropIcon}>
              <Wheat size={20} color="#059669" />
            </View>
            <Text style={styles.cropName}>{translatedCrop}</Text>
            <View
              style={[
                styles.trendIndicator,
                item.trend === "up" ? styles.trendUp : styles.trendDown,
              ]}
            >
              {item.trend === "up" ? (
                <TrendingUp size={16} color="white" />
              ) : (
                <TrendingDown size={16} color="white" />
              )}
              <Text style={styles.trendText}>{item.change}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <DollarSign size={16} color="#f59e0b" />
              <Text style={styles.priceText}>{item.price}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#f59e0b" />
              <Text style={styles.locationText}>
                {translatedLocation || item.location}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
          <ArrowLeft size={20} color="#065f46" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {uiTranslations.title[selectedLang]}
          </Text>
          <Text style={styles.headerSubtitle}>
            {uiTranslations.subtitle[selectedLang]}
          </Text>
        </View>
      </View>

      {/* Language Buttons */}
      <View style={styles.languageRow}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langButton,
              selectedLang === lang.code && styles.langButtonActive,
            ]}
            onPress={() => {
              setSelectedLang(lang.code as "en" | "hi" | "ta");
              // re-run current search in new language
              handleSearch(searchText);
            }}
          >
            <Text
              style={[
                styles.langButtonText,
                selectedLang === lang.code && styles.langButtonTextActive,
              ]}
            >
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#059669" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={uiTranslations.searchPlaceholder[selectedLang]}
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        renderItem={renderTrendItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {uiTranslations.noResults[selectedLang]}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { color: "#052e16", fontSize: 24, fontWeight: "bold" },
  headerSubtitle: { color: "#059669", fontSize: 14 },
  languageRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  langButton: {
    marginHorizontal: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#e0f2f1",
  },
  langButtonActive: { backgroundColor: "#059669" },
  langButtonText: { fontSize: 14, color: "#065f46", fontWeight: "600" },
  langButtonTextActive: { color: "white" },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, color: "#052e16", fontSize: 16 },
  listContainer: { paddingHorizontal: 24, paddingVertical: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dcfce7",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cropIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cropName: { flex: 1, fontSize: 18, fontWeight: "bold", color: "#052e16" },
  trendIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  trendUp: { backgroundColor: "#10b981" },
  trendDown: { backgroundColor: "#ef4444" },
  trendText: { color: "white", fontSize: 14, fontWeight: "bold", marginLeft: 4 },
  cardBody: { borderTopWidth: 1, borderTopColor: "#dcfce7", paddingTop: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  priceText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#052e16",
    marginLeft: 8,
  },
  locationText: { fontSize: 14, color: "#059669", marginLeft: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyText: { fontSize: 16, color: "#059669" },
});
