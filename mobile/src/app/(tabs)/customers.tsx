import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { formatMoney, formatPhoneInput } from '@/utils/format';

interface Customer {
  id: string;
  serialId: number;
  fullName: string;
  phoneNumber: string | null;
  totalDebt: string;
  lastActivityAt: string;
}

export default function CustomersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+998');

  const fetchCustomers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/customers${params}`);
      setCustomers(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [search])
  );

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
      const newCustomer = await api.post('/customers', {
        fullName: newName.trim(),
        phoneNumber: phone,
      });
      setModalOpen(false);
      setNewName('');
      setNewPhone('+998');
      if (newCustomer?.id) {
        router.push(`/customer/${newCustomer.id}`);
      } else {
        fetchCustomers(true);
      }
    } catch (err: any) {
      Alert.alert('Xatolik', err.data?.message || "Mijoz qo'shishda xatolik");
    }
  };

  const renderCustomer = ({ item }: { item: Customer }) => {
    const debt = Number(item.totalDebt);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/customer/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{item.fullName}</Text>
          <View style={styles.customerMeta}>
            <Text style={styles.customerId}>ID: {item.serialId}</Text>
            {item.phoneNumber ? (
              <Text style={styles.customerPhone}>📞 {item.phoneNumber}</Text>
            ) : (
              <Text style={styles.noPhone}>Telefon kiritilmagan</Text>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text
            style={[
              styles.debtAmount,
              debt > 0 ? styles.textRed : debt < 0 ? styles.textGreen : styles.textGray,
            ]}
          >
            {formatMoney(item.totalDebt)}
          </Text>
          <Text style={styles.balanceLabel}>Balans</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Mijoz ismi, telefoni yoki ID..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
        <Text style={styles.addBtnText}>+ Yangi mijoz qoʻshish</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCustomers(true);
              }}
              colors={['#4F46E5']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Mijozlar topilmadi</Text>
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.clearSearch}>Qidiruvni tozalash</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
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
                  setModalOpen(false);
                  setNewName('');
                  setNewPhone('+998');
                }}
              >
                <Text style={styles.cancelBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddCustomer}>
                <Text style={styles.submitBtnText}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  addBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  customerMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    alignItems: 'center',
  },
  customerId: {
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#6B7280',
  },
  customerPhone: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  noPhone: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  cardRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  debtAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  textRed: { color: '#DC2626' },
  textGreen: { color: '#059669' },
  textGray: { color: '#9CA3AF' },
  chevron: {
    fontSize: 22,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  clearSearch: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
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
