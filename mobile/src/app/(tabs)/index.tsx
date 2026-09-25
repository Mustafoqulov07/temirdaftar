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
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { formatMoney, formatDate, formatPhoneInput } from '@/utils/format';

interface DashboardMetrics {
  totalCustomers: number;
  totalDebtSum: number;
  todayPaymentsSum: number;
  overdueDebtsSum: number;
  todayDebtsSum: number;
}

interface TopCustomer {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  totalDebt: number;
}

interface Activity {
  id: string;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
  date: string;
  customerName: string;
  comment: string | null;
}

interface CustomerOption {
  id: string;
  fullName: string;
  totalDebt: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [customerModal, setCustomerModal] = useState(false);
  const [debtModal, setDebtModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  // Customer form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+998');

  // Customer list for debt/payment select
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSelectModal, setCustomerSelectModal] = useState(false);
  const [selectTarget, setSelectTarget] = useState<'debt' | 'payment'>('debt');

  // Debt form
  const [debtProduct, setDebtProduct] = useState('');
  const [debtQty, setDebtQty] = useState('1');
  const [debtPrice, setDebtPrice] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtComment, setDebtComment] = useState('');

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentComment, setPaymentComment] = useState('');

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get('/stores/dashboard');
      setMetrics(data.metrics);
      setTopCustomers(data.topCustomers);
      setActivities(data.activities);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(true);
  };

  const fetchCustomersForSelect = async () => {
    try {
      const data = await api.get('/customers');
      setAllCustomers(data);
    } catch {}
  };

  const getSelectedCustomerName = () => {
    const c = allCustomers.find(c => c.id === selectedCustomerId);
    return c ? c.fullName : 'Tanlang...';
  };

  // Handle customer creation
  const handleAddCustomer = async () => {
    if (!newName.trim()) {
      Alert.alert('Xatolik', 'Mijoz ismini kiriting');
      return;
    }
    try {
      const phone = newPhone.length === 13 ? newPhone : undefined;
      if (phone && user?.phoneNumber && phone === user.phoneNumber) {
        Alert.alert('Xatolik', "O'zingizning raqamingizni mijoz sifatida qo'sha olmaysiz");
        return;
      }
      await api.post('/customers', { fullName: newName.trim(), phoneNumber: phone });
      Alert.alert('Muvaffaqiyat', "Mijoz qo'shildi");
      setCustomerModal(false);
      setNewName('');
      setNewPhone('+998');
      fetchDashboard(true);
    } catch (err: any) {
      Alert.alert('Xatolik', err.data?.message || "Mijoz qo'shishda xatolik");
    }
  };

  // Handle debt creation
  const handleAddDebt = async () => {
    if (!selectedCustomerId || !debtProduct || !debtPrice) {
      Alert.alert('Xatolik', "Barcha maydonlarni to'ldiring");
      return;
    }
    try {
      const dueDate = debtDueDate
        ? new Date(debtDueDate).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await api.post('/debts', {
        customerId: selectedCustomerId,
        items: [{
          productName: debtProduct,
          quantity: Number(debtQty) || 1,
          pricePerUnit: Number(debtPrice),
        }],
        dueDate,
        comment: debtComment || undefined,
      });
      Alert.alert('Muvaffaqiyat', 'Qarz yozildi');
      setDebtModal(false);
      resetDebtForm();
      fetchDashboard(true);
    } catch (err: any) {
      Alert.alert('Xatolik', err.data?.message || 'Qarz yozishda xatolik');
    }
  };

  // Handle payment creation
  const handleAddPayment = async () => {
    if (!selectedCustomerId || !paymentAmount) {
      Alert.alert('Xatolik', "Barcha maydonlarni to'ldiring");
      return;
    }
    try {
      await api.post('/payments', {
        customerId: selectedCustomerId,
        amount: Number(paymentAmount),
        comment: paymentComment || undefined,
      });
      Alert.alert('Muvaffaqiyat', "To'lov qabul qilindi");
      setPaymentModal(false);
      resetPaymentForm();
      fetchDashboard(true);
    } catch (err: any) {
      Alert.alert('Xatolik', err.data?.message || "To'lov qabul qilishda xatolik");
    }
  };

  const resetDebtForm = () => {
    setSelectedCustomerId('');
    setDebtProduct('');
    setDebtQty('1');
    setDebtPrice('');
    setDebtDueDate('');
    setDebtComment('');
  };

  const resetPaymentForm = () => {
    setSelectedCustomerId('');
    setPaymentAmount('');
    setPaymentComment('');
  };

  const openDebtModal = async () => {
    await fetchCustomersForSelect();
    resetDebtForm();
    setDebtModal(true);
  };

  const openPaymentModal = async () => {
    await fetchCustomersForSelect();
    resetPaymentForm();
    setPaymentModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Maʻlumotlar yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
    >
      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionOutline]}
          onPress={() => setCustomerModal(true)}
        >
          <Text style={styles.actionOutlineText}>+ Mijoz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPrimary]}
          onPress={openDebtModal}
        >
          <Text style={styles.actionPrimaryText}>+ Qarz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionGreen]}
          onPress={openPaymentModal}
        >
          <Text style={styles.actionPrimaryText}>+ Toʻlov</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Jami mijozlar</Text>
          <Text style={styles.metricValue}>{metrics?.totalCustomers ?? 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Jami qarzdorlik</Text>
          <Text style={[styles.metricValue, styles.textRed]}>{formatMoney(metrics?.totalDebtSum ?? 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Bugungi toʻlovlar</Text>
          <Text style={[styles.metricValue, styles.textGreen]}>{formatMoney(metrics?.todayPaymentsSum ?? 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Muddati oʻtgan</Text>
          <Text style={[styles.metricValue, styles.textRose]}>{formatMoney(metrics?.overdueDebtsSum ?? 0)}</Text>
        </View>
      </View>

      {/* Top Debtors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eng koʻp qarzdorlar</Text>
        {topCustomers.length === 0 ? (
          <Text style={styles.emptyText}>Hozircha qarzdor mijozlar yoʻq</Text>
        ) : (
          topCustomers.map(c => (
            <TouchableOpacity
              key={c.id}
              style={styles.debtorRow}
              onPress={() => router.push(`/customer/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.debtorName}>{c.fullName}</Text>
                {c.phoneNumber ? (
                  <Text style={styles.debtorPhone}>📞 {c.phoneNumber}</Text>
                ) : null}
              </View>
              <Text style={styles.debtorAmount}>{formatMoney(c.totalDebt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Oxirgi operatsiyalar</Text>
        {activities.length === 0 ? (
          <Text style={styles.emptyText}>Hozircha tranzaksiya mavjud emas</Text>
        ) : (
          activities.map(act => (
            <View key={act.id} style={styles.activityRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.activityHeader}>
                  <View
                    style={[
                      styles.activityBadge,
                      act.type === 'DEBT' ? styles.badgeRed : styles.badgeGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.activityBadgeText,
                        act.type === 'DEBT' ? styles.badgeRedText : styles.badgeGreenText,
                      ]}
                    >
                      {act.type === 'DEBT' ? 'Qarz' : 'Toʻlov'}
                    </Text>
                  </View>
                  <Text style={styles.activityCustomer}>{act.customerName}</Text>
                </View>
                <Text style={styles.activityDate}>
                  {formatDate(act.date)} {act.comment ? `• ${act.comment}` : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.activityAmount,
                  act.type === 'DEBT' ? styles.textRed : styles.textGreen,
                ]}
              >
                {act.type === 'DEBT' ? '+' : '-'}{formatMoney(act.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ====== MODALS ====== */}

      {/* Add Customer Modal */}
      <Modal visible={customerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yangi mijoz qoʻshish</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Toʻliq ism</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ism Familiya"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon (ixtiyoriy)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPhone}
                onChangeText={t => setNewPhone(formatPhoneInput(t))}
                keyboardType="phone-pad"
                placeholder="+998901234567"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setCustomerModal(false);
                  setNewName('');
                  setNewPhone('+998');
                }}
              >
                <Text style={styles.cancelBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddCustomer}>
                <Text style={styles.submitBtnText}>Qoʻshish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal visible={debtModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yangi qarz yozish</Text>

              {/* Customer selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mijoz</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => {
                    setSelectTarget('debt');
                    setCustomerSelectModal(true);
                  }}
                >
                  <Text style={selectedCustomerId ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                    {getSelectedCustomerName()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mahsulot nomi</Text>
                <TextInput
                  style={styles.modalInput}
                  value={debtProduct}
                  onChangeText={setDebtProduct}
                  placeholder="Guruch, yogʻ, un..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Miqdori</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={debtQty}
                    onChangeText={setDebtQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Narxi (soʻm)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={debtPrice}
                    onChangeText={setDebtPrice}
                    keyboardType="numeric"
                    placeholder="12000"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Izoh (ixtiyoriy)</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                  value={debtComment}
                  onChangeText={setDebtComment}
                  placeholder="Qoʻshimcha eslatma..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setDebtModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddDebt}>
                  <Text style={styles.submitBtnText}>Qarz yozish</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal visible={paymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Toʻlov qabul qilish</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mijoz</Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => {
                  setSelectTarget('payment');
                  setCustomerSelectModal(true);
                }}
              >
                <Text style={selectedCustomerId ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                  {selectedCustomerId
                    ? `${getSelectedCustomerName()} (${formatMoney(Number(allCustomers.find(c => c.id === selectedCustomerId)?.totalDebt || 0))})`
                    : 'Tanlang...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Toʻlov summasi (soʻm)</Text>
              <TextInput
                style={styles.modalInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="50000"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Izoh (ixtiyoriy)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={paymentComment}
                onChangeText={setPaymentComment}
                placeholder="Naqd, karta..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPaymentModal(false)}
              >
                <Text style={styles.cancelBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, styles.submitBtnGreen]} onPress={handleAddPayment}>
                <Text style={styles.submitBtnText}>Toʻlovni saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Select Modal */}
      <Modal visible={customerSelectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Mijozni tanlang</Text>
            <ScrollView>
              {allCustomers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.selectItem,
                    selectedCustomerId === c.id && styles.selectItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCustomerId(c.id);
                    if (selectTarget === 'payment' && Number(c.totalDebt) > 0) {
                      setPaymentAmount(String(Math.round(Number(c.totalDebt) * 100) / 100));
                    }
                    setCustomerSelectModal(false);
                  }}
                >
                  <Text style={styles.selectItemName}>{c.fullName}</Text>
                  <Text style={styles.selectItemDebt}>{formatMoney(Number(c.totalDebt))}</Text>
                </TouchableOpacity>
              ))}
              {allCustomers.length === 0 && (
                <Text style={styles.emptyText}>Mijozlar topilmadi</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setCustomerSelectModal(false)}
            >
              <Text style={styles.cancelBtnText}>Yopish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  actionPrimary: {
    backgroundColor: '#4F46E5',
  },
  actionGreen: {
    backgroundColor: '#059669',
  },
  actionOutlineText: {
    color: '#4338CA',
    fontWeight: '700',
    fontSize: 14,
  },
  actionPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '48.5%' as any,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6,
  },
  textRed: { color: '#DC2626' },
  textGreen: { color: '#059669' },
  textRose: { color: '#BE123C' },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingVertical: 16,
  },

  // Debtor row
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  debtorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  debtorPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  debtorAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },

  // Activity row
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeRed: { backgroundColor: '#FEF2F2' },
  badgeGreen: { backgroundColor: '#ECFDF5' },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeRedText: { color: '#B91C1C' },
  badgeGreenText: { color: '#047857' },
  activityCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
  },
  selectBtn: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectBtnText: {
    fontSize: 15,
    color: '#111827',
  },
  selectBtnPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  selectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderRadius: 8,
  },
  selectItemActive: {
    backgroundColor: '#EEF2FF',
  },
  selectItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  selectItemDebt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
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
  submitBtnGreen: {
    backgroundColor: '#059669',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
