import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';

const STAGES = [
  { id: 0, label: 'REGISTRATION', desc: 'Farmer registered in Mandi procurement system' },
  { id: 1, label: 'SLOT BOOKED', desc: 'Arrival date & weighbridge time window confirmed' },
  { id: 2, label: 'CHECKED IN', desc: 'Farmer vehicle entered Mandi boom barrier Gate 2' },
  { id: 3, label: 'WEIGHING', desc: 'Gross & tare weight calibrated at certified weighbridge' },
  { id: 4, label: 'QUALITY CHECK', desc: 'Moisture (≤14%) & grain grade certified by grader' },
  { id: 5, label: 'PROCUREMENT ACCEPTED', desc: 'Purchase receipt generated & grain moved to silo' },
  { id: 6, label: 'PAYMENT INITIATED', desc: 'DBT / PFMS payment order dispatched to treasury' },
  { id: 7, label: 'PAYMENT RECEIVED', desc: 'Direct bank transfer credited to farmer UPI account' },
];

// Initial mock database for frontend testing & live API synchronization
const INITIAL_DEMO_TOKENS: Record<string, any> = {
  'TKN-1042': {
    tokenId: 'TKN-1042',
    farmerName: 'Ramesh Kumar',
    centerCode: 'CTR-01',
    statusIndex: 3,
    crop: 'Paddy (A-Grade)',
    quantityKg: 500,
  },
  'PRC-2026-001': {
    tokenId: 'PRC-2026-001',
    farmerName: 'Murugan S.',
    centerCode: 'CTR-01',
    statusIndex: 1,
    crop: 'Wheat (Durum)',
    quantityKg: 1200,
  },
  'TKN-9999': {
    tokenId: 'TKN-9999',
    farmerName: 'Anil Verma',
    centerCode: 'CTR-02', // Different center to test 403 Forbidden!
    statusIndex: 2,
    crop: 'Yellow Maize',
    quantityKg: 800,
  },
};

export default function TokenStatusManagerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Admin session center code (extracted from JWT in production)
  const [adminCenterCode, setAdminCenterCode] = useState('CTR-01');
  const [searchInput, setSearchInput] = useState('TKN-1042');
  const [tokenData, setTokenData] = useState<any>(INITIAL_DEMO_TOKENS['TKN-1042']);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'403' | '404' | 'generic' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search Token Handler
  const handleSearch = async () => {
    const query = searchInput.trim().toUpperCase();
    if (!query) return;

    setLoading(true);
    setErrorMessage(null);
    setErrorType(null);
    setSuccessMessage(null);

    try {
      // Attempt live backend API call
      const res = await fetch(`http://localhost:3000/api/queue/${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-center-code': adminCenterCode,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setTokenData(json.data);
        return;
      }

      if (res.status === 403) {
        const json = await res.json();
        setErrorType('403');
        setErrorMessage(json.error || `Access Denied: Token belongs to another procurement center.`);
        setTokenData(null);
        return;
      } else if (res.status === 404) {
        setErrorType('404');
        setErrorMessage(`Token #${query} not found in procurement registry.`);
        setTokenData(null);
        return;
      }
    } catch (e) {
      // Fallback to local demo registry with security enforcement
      console.log('[TokenManager] Backend offline, using local registry');
    } finally {
      setLoading(false);
    }

    // Local deterministic fallback
    const match = INITIAL_DEMO_TOKENS[query];
    if (!match) {
      setErrorType('404');
      setErrorMessage(`Token #${query} was not found in the Mandi records.`);
      setTokenData(null);
    } else if (match.centerCode !== adminCenterCode) {
      setErrorType('403');
      setErrorMessage(
        `Security Restriction: Token #${query} belongs to "${match.centerCode}", but your session is scoped to "${adminCenterCode}".`
      );
      setTokenData(null);
    } else {
      setTokenData({ ...match });
    }
  };

  // Advance Status Handler
  const handleAdvance = async () => {
    if (!tokenData || tokenData.statusIndex >= STAGES.length - 1) return;

    setAdvancing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Attempt live backend API call
      const res = await fetch(`http://localhost:3000/api/queue/${encodeURIComponent(tokenData.tokenId)}/advance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-center-code': adminCenterCode,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setTokenData((prev: any) => ({
          ...prev,
          statusIndex: json.data.statusIndex,
        }));
        setSuccessMessage(`Token #${tokenData.tokenId} advanced to "${STAGES[json.data.statusIndex].label}"!`);
        return;
      }
    } catch (e) {
      console.log('[TokenManager] Local advance update');
    } finally {
      setAdvancing(false);
    }

    // Local update
    const nextIdx = Math.min(STAGES.length - 1, tokenData.statusIndex + 1);
    setTokenData((prev: any) => ({
      ...prev,
      statusIndex: nextIdx,
    }));
    setSuccessMessage(`Token #${tokenData.tokenId} advanced to step ${nextIdx}: "${STAGES[nextIdx].label}"!`);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
          style={styles.backButton}
        >
          <ArrowLeft size={18} color="#166534" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Token Status Manager</Text>
          <Text style={styles.headerSub}>Admin Operational Progress Controller</Text>
        </View>

        {/* Admin Center Scope Badge */}
        <View style={styles.centerBadge}>
          <Building2 size={12} color="#059669" />
          <Text style={styles.centerBadgeText}>{adminCenterCode}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search Farmer Delivery Token</Text>
          <Text style={styles.cardSub}>
            Inspect token operational stage and advance to subsequent procurement milestones
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. TKN-1042 or PRC-2026-001"
              value={searchInput}
              onChangeText={setSearchInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={loading || !searchInput.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Search size={16} color="#FFFFFF" />
                  <Text style={styles.searchBtnText}>Search</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Presets for Admin Testing */}
          <View style={styles.presetsWrap}>
            <Text style={styles.presetsLabel}>Test Tokens:</Text>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setSearchInput('TKN-1042')}
            >
              <Text style={styles.presetChipText}>TKN-1042 (CTR-01)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setSearchInput('PRC-2026-001')}
            >
              <Text style={styles.presetChipText}>PRC-2026-001</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, styles.presetChipOther]}
              onPress={() => setSearchInput('TKN-9999')}
            >
              <Lock size={10} color="#B45309" />
              <Text style={styles.presetChipTextOther}>TKN-9999 (Test 403)</Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View
              style={[
                styles.alertBox,
                errorType === '403' ? styles.alertBoxForbidden : styles.alertBoxNotFound,
              ]}
            >
              {errorType === '403' ? (
                <Lock size={20} color="#B45309" />
              ) : (
                <AlertTriangle size={20} color="#DC2626" />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.alertTitle,
                    errorType === '403' ? styles.alertTitleForbidden : styles.alertTitleNotFound,
                  ]}
                >
                  {errorType === '403' ? 'Security Restriction (403 Forbidden)' : 'Search Error'}
                </Text>
                <Text style={styles.alertDesc}>{errorMessage}</Text>
              </View>
            </View>
          )}

          {/* Success Banner */}
          {successMessage && (
            <View style={styles.successBox}>
              <CheckCircle2 size={18} color="#059669" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}
        </View>

        {/* Token Details & 8-Step Timeline */}
        {tokenData && (
          <View style={styles.card}>
            {/* Header & Farmer Summary */}
            <View style={styles.tokenProfileHeader}>
              <View>
                <Text style={styles.tokenProfileTag}>FARMER DELIVERY PROFILE</Text>
                <Text style={styles.tokenIdHeader}>#{tokenData.tokenId}</Text>
                <Text style={styles.farmerNameText}>
                  {tokenData.farmerName} • {tokenData.crop} ({tokenData.quantityKg} kg)
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.advanceBtn,
                  tokenData.statusIndex >= STAGES.length - 1 && styles.advanceBtnDisabled,
                ]}
                onPress={handleAdvance}
                disabled={advancing || tokenData.statusIndex >= STAGES.length - 1}
              >
                {advancing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : tokenData.statusIndex >= STAGES.length - 1 ? (
                  <Text style={styles.advanceBtnText}>All 8 Steps Complete 🎉</Text>
                ) : (
                  <>
                    <Text style={styles.advanceBtnText}>Advance Status</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* 8-Step Visual Timeline */}
            <Text style={styles.timelineSectionTitle}>8-Step Operational Lifecycle</Text>

            <View style={styles.stepperContainer}>
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < tokenData.statusIndex;
                const isCurrent = idx === tokenData.statusIndex;
                const isUpcoming = idx > tokenData.statusIndex;

                return (
                  <View key={stage.id} style={styles.stepRow}>
                    {/* Stepper Connector Line */}
                    {idx !== STAGES.length - 1 && (
                      <View
                        style={[
                          styles.connectorLine,
                          idx < tokenData.statusIndex && styles.connectorLineCompleted,
                        ]}
                      />
                    )}

                    {/* Step Node Circle */}
                    <View
                      style={[
                        styles.stepNode,
                        isCompleted && styles.stepNodeCompleted,
                        isCurrent && styles.stepNodeCurrent,
                        isUpcoming && styles.stepNodeUpcoming,
                      ]}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={16} color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNodeText,
                            isCurrent && styles.stepNodeTextCurrent,
                            isUpcoming && styles.stepNodeTextUpcoming,
                          ]}
                        >
                          {idx}
                        </Text>
                      )}
                    </View>

                    {/* Step Description */}
                    <View style={styles.stepContent}>
                      <View style={styles.stepHeaderLine}>
                        <Text
                          style={[
                            styles.stepLabel,
                            isCurrent && styles.stepLabelCurrent,
                            isCompleted && styles.stepLabelCompleted,
                          ]}
                        >
                          {stage.label}
                        </Text>

                        {isCurrent && (
                          <View style={styles.activeStepPill}>
                            <Text style={styles.activeStepPillText}>Current Active Stage</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stepDesc}>{stage.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
  },
  headerSub: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  centerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  centerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  presetsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  presetChipOther: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  presetChipTextOther: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  alertBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  alertBoxForbidden: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  alertBoxNotFound: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertTitleForbidden: {
    color: '#92400E',
  },
  alertTitleNotFound: {
    color: '#991B1B',
  },
  alertDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  tokenProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  tokenProfileTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  tokenIdHeader: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  farmerNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  advanceBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  advanceBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  timelineSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperContainer: {
    position: 'relative',
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: 14,
    top: 28,
    bottom: -16,
    width: 2,
    backgroundColor: '#CBD5E1',
    zIndex: 0,
  },
  connectorLineCompleted: {
    backgroundColor: '#059669',
  },
  stepNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepNodeCompleted: {
    backgroundColor: '#059669',
  },
  stepNodeCurrent: {
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#DCFCE7',
  },
  stepNodeUpcoming: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepNodeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  stepNodeTextCurrent: {
    color: '#FFFFFF',
  },
  stepNodeTextUpcoming: {
    color: '#94A3B8',
  },
  stepContent: {
    flex: 1,
  },
  stepHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
  },
  stepLabelCurrent: {
    color: '#064E3B',
  },
  stepLabelCompleted: {
    color: '#0F172A',
  },
  activeStepPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeStepPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  stepDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
