import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { formatMoney, formatDate } from '@/utils/format';

interface TrendItem {
  percent: number;
  direction: 'up' | 'down' | 'neutral';
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalStores: number;
  totalCustomers: number;
  telegramUsersCount: number;
  debtsCount: number;
  paymentsCount: number;
  totalDebtsSum: number;
  totalPaymentsSum: number;
  totalBalance: number;
  trends: {
    debts: TrendItem;
    payments: TrendItem;
    stores: TrendItem;
    customers: TrendItem;
  };
  recentStores: Array<{
    id: string;
    name: string;
    address: string | null;
    createdAt: string;
    ownerName: string;
    ownerPhone: string;
    isBlocked: boolean;
    role: string;
    customerCount: number;
  }>;
}

interface AdminStore {
  id: string;
  name: string;
  address: string | null;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    isBlocked: boolean;
    role: string;
  };
  customerCount: number;
  balance: number;
  totalDebtSum: number;
  totalPaymentSum: number;
}

export default function AdminScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Do'konlar modal
  const [storesOpen, setStoresOpen] = useState(false);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Parol yangilash
  const [pwModal, setPwModal] = useState<AdminStore | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.get<AdminStats>('/admin/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.data?.message || 'Statistikani yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const fetchStores = async (q = '') => {
    setStoresLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const data = await api.get<AdminStore[]>(`/admin/stores${params}`);
      setStores(data);
    } catch (err: any) {
      Alert.alert('Xatolik', err.data?.message || "Do'konlarni yuklashda xatolik");
    } finally {
      setStoresLoading(false);
    }
  };

  const openStores = () => {
    setStoresOpen(true);
    fetchStores();
  };

  const handleToggleBlock = (store: AdminStore) => {
    if (store.user.role === 'SUPER_ADMIN') {
      Alert.alert('Xatolik', 'Super Admin foydalanuvchisini bloklash mumkin emas!');
      return;
    }
    Alert.alert(
      store.user.isBlocked ? 'Blokdan chiqarish' : 'Bloklash',
      `"${store.name}" do'koni egasini ${store.user.isBlocked ? 'blokdan chiqaraszmi?' : 'bloklaszmi?'}`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Ha',
          style: store.user.isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/admin/stores/${store.id}/toggle-block`, {});
              fetchStores(search);
              fetchStats(true);
            } catch (err: any) {
              Alert.alert('Xatolik', err.data?.message || 'Amal bajarilmadi');
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    if (!pwModal) return;
    if (newPassword.trim().length < 6) {
      Alert.alert('Xatolik', 'Parol kamida 6 ta belgidan iborat boʻlishi kerak');
      return;
    }
    try {
      await api.post(`/admin/stores/${pwModal.id}/reset-password`, {
        newPassword: newPassword.trim(),
      });
      Alert.alert('Muvaffaqiyat', `"${pwModal.name}" egasi paroli yangilandi`);
      setPwModal(null);
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Xatolik', err.data?.message || 'Parol yangilanmadi');
    }
  };

  const trendLabel = (t?: TrendItem) => {
    if (!t || t.direction === 'neutral') return '0%';
    return `${t.direction === 'up' ? '▲' : '▼'} ${t.percent}%`;
  };

  const trendColor = (t?: TrendItem) =>
    !t || t.direction === 'neutral' ? '#9CA3AF' : t.direction === 'up' ? '#059669' : '#DC2626';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Statistika yuklanmoqda...</Text>
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchStats()}>
          <Text style={styles.retryBtnText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const recoveryRate =
    stats && stats.totalDebtsSum > 0
      ? Math.min(Math.round((stats.totalPaymentsSum / stats.totalDebtsSum) * 100), 100)
      : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} colors={['#4F46E5']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>🛡️ SUPER ADMIN</Text>
        </View>
        <Text style={styles.title}>Boshqaruv Markazi</Text>
        <Text style={styles.subtitle}>Tizim faoliyatining real vaqtli analitikasi</Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderTopColor: '#4F46E5' }]}>
          <Text style={styles.kpiLabel}>Berilgan qarzlar</Text>
          <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>
            {formatMoney(stats?.totalDebtsSum ?? 0)}
          </Text>
          <Text style={[styles.kpiTrend, { color: trendColor(stats?.trends.debts) }]}>
            {trendLabel(stats?.trends.debts)} · {stats?.debtsCount ?? 0} yozuv
          </Text>
        </View>
        <View style={[styles.kpiCard, { borderTopColor: '#059669' }]}>
          <Text style={styles.kpiLabel}>Undirilgan toʻlovlar</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            {formatMoney(stats?.totalPaymentsSum ?? 0)}
          </Text>
          <Text style={[styles.kpiTrend, { color: trendColor(stats?.trends.payments) }]}>
            {trendLabel(stats?.trends.payments)} · {stats?.paymentsCount ?? 0} toʻlov
          </Text>
        </View>
        <View style={[styles.kpiCard, { borderTopColor: '#D97706' }]}>
          <Text style={styles.kpiLabel}>Qoldiq balans</Text>
          <Text style={[styles.kpiValue, { color: '#D97706' }]}>
            {formatMoney(stats?.totalBalance ?? 0)}
          </Text>
          <Text style={styles.kpiTrend}>Undirish darajasi {recoveryRate}%</Text>
          {/* Undirish progressbar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${recoveryRate}%` }]} />
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.quickGrid}>
        <View style={styles.quickCard}>
          <Text style={styles.quickEmoji}>🏪</Text>
          <Text style={styles.quickValue}>{stats?.totalStores ?? 0}</Text>
          <Text style={styles.quickLabel}>Doʻkonlar</Text>
        </View>
        <View style={styles.quickCard}>
          <Text style={styles.quickEmoji}>👥</Text>
          <Text style={styles.quickValue}>{stats?.totalCustomers ?? 0}</Text>
          <Text style={styles.quickLabel}>Mijozlar</Text>
        </View>
        <View style={styles.quickCard}>
          <Text style={styles.quickEmoji}>👤</Text>
          <Text style={styles.quickValue}>{stats?.totalUsers ?? 0}</Text>
          <Text style={styles.quickLabel}>Foydalanuvchi</Text>
        </View>
        <View style={styles.quickCard}>
          <Text style={styles.quickEmoji}>✈️</Text>
          <Text style={styles.quickValue}>{stats?.telegramUsersCount ?? 0}</Text>
          <Text style={styles.quickLabel}>Telegram</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.actionBtn} onPress={openStores} activeOpacity={0.8}>
        <Text style={styles.actionBtnText}>🏪 Doʻkonlarni boshqarish</Text>
      </TouchableOpacity>

      {/* Recent stores */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soʻnggi ochilgan doʻkonlar</Text>
        {stats?.recentStores && stats.recentStores.length > 0 ? (
          stats.recentStores.map((s, i) => (
            <View key={s.id} style={styles.storeRow}>
              <View style={styles.storeIndex}>
                <Text style={styles.storeIndexText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{s.name}</Text>
                <Text style={styles.storeOwner}>
                  {s.ownerName} · {s.ownerPhone}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.storeCustomers}>{s.customerCount} mijoz</Text>
                <Text
                  style={[
                    styles.storeStatus,
                    { color: s.isBlocked ? '#DC2626' : '#059669' },
                  ]}
                >
                  {s.isBlocked ? '● Bloklangan' : '● Faol'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Hozircha doʻkon topilmadi</Text>
        )}
      </View>

      {/* ===== Stores Modal ===== */}
      <Modal visible={storesOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Doʻkonlarni boshqarish</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Doʻkon, egasi yoki telefon..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={() => fetchStores(search)}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={() => fetchStores(search)}>
                <Text style={styles.searchBtnText}>🔍</Text>
              </TouchableOpacity>
            </View>

            {storesLoading ? (
              <ActivityIndicator color="#4F46E5" style={{ paddingVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {stores.map((s) => (
                  <View key={s.id} style={styles.manageRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.manageName}>{s.name}</Text>
                      <Text style={styles.manageOwner}>
                        {s.user.fullName} · {s.user.phoneNumber}
                      </Text>
                      <Text style={styles.manageBalance}>
                        Balans: {formatMoney(s.balance)} · {s.customerCount} mijoz
                      </Text>
                    </View>
                    <View style={styles.manageActions}>
                      <TouchableOpacity
                        style={[
                          styles.manageBtn,
                          s.user.isBlocked ? styles.manageBtnUnblock : styles.manageBtnBlock,
                        ]}
                        onPress={() => handleToggleBlock(s)}
                      >
                        <Text
                          style={[
                            styles.manageBtnText,
                            { color: s.user.isBlocked ? '#059669' : '#DC2626' },
                          ]}
                        >
                          {s.user.isBlocked ? 'Blokdan chiqar' : 'Bloklash'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.manageBtn, styles.manageBtnPw]}
                        onPress={() => {
                          setPwModal(s);
                          setNewPassword('');
                        }}
                      >
                        <Text style={[styles.manageBtnText, { color: '#4F46E5' }]}>Parol</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {stores.length === 0 && (
                  <Text style={styles.emptyText}>Doʻkonlar topilmadi</Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setStoresOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Yopish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== Reset Password Modal ===== */}
      <Modal visible={!!pwModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Parolni yangilash</Text>
            {pwModal && (
              <Text style={styles.pwStoreName}>
                {pwModal.name} · {pwModal.user.fullName}
              </Text>
            )}
            <TextInput
              style={styles.pwInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Yangi parol (kamida 6 belgi)"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setPwModal(null);
                  setNewPassword('');
                }}
              >
                <Text style={styles.cancelBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword}>
                <Text style={styles.submitBtnText}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Header
  header: {
    marginBottom: 20,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4338CA',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  // KPI
  kpiGrid: {
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 21,
    fontWeight: '900',
    marginTop: 6,
  },
  kpiTrend: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },

  // Quick stats
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    width: '48.5%' as any,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  quickEmoji: {
    fontSize: 20,
  },
  quickValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4,
  },
  quickLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  // Action
  actionBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  storeIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeIndexText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4F46E5',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  storeOwner: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  storeCustomers: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  storeStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingVertical: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  searchBtn: {
    width: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    fontSize: 16,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  manageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  manageOwner: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  manageBalance: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  manageActions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  manageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageBtnBlock: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  manageBtnUnblock: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  manageBtnPw: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pwStoreName: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  pwInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
