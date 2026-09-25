import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, store, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Chiqish',
      'Haqiqatan ham tizimdan chiqmoqchimisiz?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Chiqish',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'T'}
          </Text>
        </View>
        <Text style={styles.fullName}>{user?.fullName || 'Noma\'lum'}</Text>
        <Text style={styles.phone}>📞 {user?.phoneNumber || '—'}</Text>
      </View>

      {/* Store Info */}
      {store && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🏪 Doʻkon maʻlumotlari</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nomi:</Text>
            <Text style={styles.infoValue}>{store.name}</Text>
          </View>
          {store.address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Manzil:</Text>
              <Text style={styles.infoValue}>{store.address}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* App Info */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>📱 Ilova haqida</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ilova:</Text>
          <Text style={styles.infoValue}>Temir Daftar</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versiya:</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>🚪 Tizimdan chiqish</Text>
      </TouchableOpacity>
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
    paddingBottom: 48,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  fullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  phone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
});
