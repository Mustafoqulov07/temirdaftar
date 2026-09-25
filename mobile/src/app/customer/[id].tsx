import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { formatMoney, formatDate, formatPhoneInput } from '@/utils/format';

interface CustomerInfo {
  id: string;
  serialId: number;
  fullName: string;
  phoneNumber: string | null;
  totalDebt: number;
  lastActivityAt: string;
  createdAt: string;
}

interface DebtItemInfo {
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

interface HistoryItem {
  id: string;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
  date: string;
  comment: string | null;
  isPaid?: boolean;
  dueDate?: string;
  items?: DebtItemInfo[];
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Array.isArray(id) ? id[0] : id;

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('+998');
  const [editSaving, setEditSaving] = useState(false);

  // Debt modal
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtProduct, setDebtProduct] = useState('');
  const [debtQty, setDebtQty] = useState('1');
  const [debtPrice, setDebtPrice] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtComment, setDebtComment] = useState('');

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentComment, setPaymentComment] = useState('');

  const fetchDetail = async (silent = false) => {
    if (!customerId) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.get(`/customers/${customerId}`);
      setCustomer(data.customer);
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err?.data?.message || 'Mijoz maʼlumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [customerId])
  );

  const openEditModal = () => {
    setEditName(customer?.fullName || '');
    setEditPhone(customer?.phoneNumber || '+998');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editName.trim()) {
      Alert.alert('Xatolik', 'Mijoz ismini kiriting');
      return;
    }
    setEditSaving(true);
    try {
      const phone = editPhone.length === 13 ? editPhone : null;
      await api.put(`/customers/${customerId}`, {
        fullName: editName.trim(),
        phoneNumber: phone || undefined,
      });
      setEditModalOpen(false);
      fetchDetail(true);
    } catch (err: any) {
      Alert.alert('Xatolik', err?.data?.message || 'Tahrirlashda xatolik yuz berdi');
    } finally {
      setEditSaving(false);
    }
  };

  const openDebtModal = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const iso = defaultDate.toISOString().split('T')[0];
    setDebtProduct('');
    setDebtQty('1');
    setDebtPrice('');
    setDebtDueDate(iso);
    setDebtComment('');
    setDebtModalOpen(true);
  };

  const handleAddDebt = async () => {
    if (!debtProduct.trim() || !debtPrice) {
      Alert.alert('Xatolik', 'Mahsulot nomi va narxini kiriting');
      return;
    }
    try {
      await api.post('/debts', {
        customerId,
        items: [
          {
            productName: debtProduct.trim(),
            quantity: Number(debtQty) || 1,
            pricePerUnit: Number(debtPrice),
          },
        ],
        dueDate: debtDueDate
          ? new Date(debtDueDate).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        comment: debtComment.trim() || undefined,
      });
      setDebtModalOpen(false);
      fetchDetail(true);
    } catch (err: any) {
      Alert.alert('Xatolik', err?.data?.message || 'Qarz yozishda xatolik yuz berdi');
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) {
      Alert.alert('Xatolik', 'Toʻlov summasini kiriting');
      return;
    }
    const amountNum = Number(paymentAmount);
    const currentDebt = Math.round(Number(customer?.totalDebt || 0) * 100) / 100;
    if (amountNum > currentDebt) {
      Alert.alert('Xatolik', 'Toʻlov summasi mijoz qarzidan koʻp boʻlishi mumkin emas');
      return;
    }
    try {
      await api.post('/payments', {
        customerId,
        amount: amountNum,
        comment: paymentComment.trim() || undefined,
      });
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentComment('');
      fetchDetail(true);
    } catch (err: any) {
      Alert.alert('Xatolik', err?.data?.message || 'Toʻlov qabul qilishda xatolik yuz berdi');
    }
  };

  const confirmDeleteCustomer = () => {
    Alert.alert(
      'Mijozni oʻchirish',
      'Haqiqatan ham ushbu mijozni va barcha qarz/toʻlovlar tarixini oʻchirmoqchimisiz? Bu amalni ortga qaytarib boʻlmaydi.',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Oʻchirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/customers/${customerId}`);
              router.replace('/(tabs)/customers');
            } catch (err: any) {
              Alert.alert('Xatolik', err?.data?.message || 'Mijozni oʻchirishda xatolik yuz berdi');
            }
          },
        },
      ]
    );
  };

  const handleResetDebtToZero = () => {
    const debtAmount = Math.round(Number(customer?.totalDebt || 0) * 100) / 100;
    if (debtAmount <= 0) {
      Alert.alert('Xatolik', 'Nollashtirish uchun qarz mavjud emas');
      return;
    }
    Alert.alert(
      'Qarzni nollashtirish',
      `Haqiqatan ham ushbu mijozning joriy qarzini (${formatMoney(debtAmount)}) nollashtirmoqchimisiz?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Ha, nollashtirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/payments', {
                customerId,
                amount: debtAmount,
                comment: 'Qarz nollashtirildi (tizim tomonidan)',
              });
              fetchDetail(true);
            } catch (err: any) {
              Alert.alert('Xatolik', err?.data?.message || 'Qarzni nollashtirishda xatolik yuz berdi');
            }
          },
        },
      ]
    );
  };

  const getDebtStatus = (item: HistoryItem) => {
    if (item.isPaid) return { text: 'Toʻlangan', style: styles.badgeGreen, textStyle: styles.badgeGreenText };
    if (!item.dueDate) return { text: 'Kutilmoqda', style: styles.badgeGray, textStyle: styles.badgeGrayText };
    const due = new Date(item.dueDate);
    if (isNaN(due.getTime())) return { text: 'Kutilmoqda', style: styles.badgeGray, textStyle: styles.badgeGrayText };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return { text: 'Muddati oʻtgan', style: styles.badgeRed, textStyle: styles.badgeRedText };
    return { text: 'Kutilmoqda', style: styles.badgeGray, textStyle: styles.badgeGrayText };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Mijoz maʼlumotlari yuklanmoqda...</Text>
      </SafeAreaView>
    );
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Mijozlar</Text>
        </TouchableOpacity>
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{error || 'Mijoz topilmadi.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDetail(true);
            }}
            colors={['#4F46E5']}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Mijozlar</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={openEditModal}>
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={confirmDeleteCustomer}>
              <Text style={styles.iconBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <Text style={styles.customerName}>{customer.fullName}</Text>
          <View style={styles.nameRow}>
            <Text style={styles.serialId}>ID: {customer.serialId}</Text>
            {customer.phoneNumber ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${customer.phoneNumber}`)}
              >
                <Text style={styles.phone}>📞 {customer.phoneNumber}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPhone}>Telefon raqam kiritilmagan</Text>
            )}
          </View>
          <Text style={styles.createdAt}>Qoʻshilgan sana: {formatDate(customer.createdAt)}</Text>

          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>UMUMIY QARZ BALANSI</Text>
            <Text
              style={[
                styles.balanceValue,
                customer.totalDebt > 0
                  ? styles.textRed
                  : customer.totalDebt < 0
                  ? styles.textGreen
                  : styles.textGray,
              ]}
            >
              {formatMoney(customer.totalDebt)}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionDebt]} onPress={openDebtModal}>
            <Text style={styles.actionBtnText}>+ Qarz yozish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionPayment]} onPress={() => setPaymentModalOpen(true)}>
            <Text style={styles.actionBtnText}>+ Toʻlov</Text>
          </TouchableOpacity>
        </View>

        {Number(customer.totalDebt) > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetDebtToZero}>
            <Text style={styles.resetBtnText}>🔄 Qarzni 0 ga tushirish (Nollashtirish)</Text>
          </TouchableOpacity>
        )}

        {/* History */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Qarzlar va toʻlovlar tarixi</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Hozircha hech qanday tarix topilmadi.</Text>
          ) : (
            history.map((item) => {
              const isDebt = item.type === 'DEBT';
              const status = isDebt ? getDebtStatus(item) : null;
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={[styles.historyIcon, isDebt ? styles.historyIconRed : styles.historyIconGreen]}>
                    <Text style={{ fontSize: 16 }}>{isDebt ? '🛍️' : '💳'}</Text>
                  </View>
                  <View style={styles.historyMain}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyType}>{isDebt ? 'Qarz' : 'Toʻlov qabul qilindi'}</Text>
                      <Text style={styles.historyDate}>({formatDate(item.date)})</Text>
                      {status ? (
                        <View style={[styles.badge, status.style]}>
                          <Text style={[styles.badgeText, status.textStyle]}>{status.text}</Text>
                        </View>
                      ) : null}
                    </View>

                    {isDebt && item.items && item.items.length > 0 ? (
                      <View style={styles.itemsBox}>
                        {item.items.map((prod, idx) => (
                          <Text key={idx} style={styles.itemLine}>
                            🛍️ <Text style={styles.itemName}>{prod.productName}</Text>: {prod.quantity} dona × {formatMoney(prod.pricePerUnit)}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {item.comment ? (
                      <Text style={styles.historyComment}>Izoh: {item.comment}</Text>
                    ) : null}

                    {isDebt && !item.isPaid && item.dueDate ? (
                      <Text style={styles.dueDate}>📅 Toʻlash muddati: {formatDate(item.dueDate)}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.historyAmount, isDebt ? styles.textRed : styles.textGreen]}>
                    {isDebt ? '+' : '-'}
                    {formatMoney(item.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Customer Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mijoz maʼlumotlarini tahrirlash</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mijoz ismi</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ism Familiya"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon raqami</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={(t) => setEditPhone(formatPhoneInput(t))}
                keyboardType="phone-pad"
                placeholder="+998901234567"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleEditSubmit} disabled={editSaving}>
                {editSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Saqlash</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal visible={debtModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yangi qarz yozish</Text>

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
                  <Text style={styles.inputLabel}>Dona narxi (soʻm)</Text>
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
                <Text style={styles.inputLabel}>Toʻlov muddati (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={debtDueDate}
                  onChangeText={setDebtDueDate}
                  placeholder="2026-01-15"
                  placeholderTextColor="#9CA3AF"
                />
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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDebtModalOpen(false)}>
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
      <Modal visible={paymentModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Toʻlov qabul qilish</Text>

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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, styles.submitBtnGreen]} onPress={handleAddPayment}>
                <Text style={styles.submitBtnText}>Toʻlovni saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  errorBoxText: {
    color: '#B91C1C',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 15,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  iconBtnText: {
    fontSize: 16,
  },

  // Profile
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  serialId: {
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    color: '#6B7280',
    overflow: 'hidden',
  },
  phone: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  noPhone: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  createdAt: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  balanceBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionDebt: {
    backgroundColor: '#4F46E5',
  },
  actionPayment: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  resetBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  resetBtnText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 13,
  },

  // History
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historyTitle: {
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
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  historyIconRed: {
    backgroundColor: '#FEF2F2',
  },
  historyIconGreen: {
    backgroundColor: '#ECFDF5',
  },
  historyMain: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  historyType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  historyDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeGreenText: {
    color: '#047857',
  },
  badgeGray: {
    backgroundColor: '#F3F4F6',
  },
  badgeGrayText: {
    color: '#6B7280',
  },
  badgeRed: {
    backgroundColor: '#FEF2F2',
  },
  badgeRedText: {
    color: '#B91C1C',
  },
  itemsBox: {
    marginTop: 4,
  },
  itemLine: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemName: {
    fontWeight: '700',
    color: '#111827',
  },
  historyComment: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#BE123C',
    fontWeight: '600',
    marginTop: 4,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  textRed: { color: '#DC2626' },
  textGreen: { color: '#059669' },
  textGray: { color: '#9CA3AF' },

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
