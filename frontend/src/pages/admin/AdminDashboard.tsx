import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  BuildingStorefrontIcon,
  UsersIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
} from '@heroicons/react/24/outline';

interface TrendItem {
  percent: number;
  direction: 'up' | 'down' | 'neutral';
}

interface TimelineDay {
  date: string;
  label: string;
  debts: number;
  payments: number;
}

interface StatsData {
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
  timeline: TimelineDay[];
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

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      setError(err.response?.data?.message || 'Statistikalarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val || 0) + " so'm";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalDebts = stats?.totalDebtsSum || 0;
  const totalPayments = stats?.totalPaymentsSum || 0;
  const recoveryRate = totalDebts > 0 ? Math.min(Math.round((totalPayments / totalDebts) * 100), 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 text-sm font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Boshqaruv Paneli</h1>
          <p className="text-gray-600 text-sm mt-1">Tizim faoliyatining umumiy ko'rinishi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Yangilash
          </button>
          <Link
            to="/admin/broadcast"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Xabar Yuborish
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Debts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Jami Berilgan Qarzlar</span>
            <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(stats?.totalDebtsSum || 0)}</p>
          <p className="text-xs text-gray-500 mt-2">{stats?.debtsCount || 0} ta yozuv</p>
        </div>

        {/* Total Payments */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Jami Undirilgan Toʻlovlar</span>
            <TrendingUpIcon className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(stats?.totalPaymentsSum || 0)}</p>
          <p className="text-xs text-gray-500 mt-2">{stats?.paymentsCount || 0} ta toʻlov</p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Kutilayotgan Qoldiq</span>
            <CurrencyDollarIcon className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(stats?.totalBalance || 0)}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">{recoveryRate}%</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Doʻkonlar Soni</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalStores || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Jami Mijozlar</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalCustomers || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Foydalanuvchilar</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Telegram Ulanishlari</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.telegramUsersCount || 0}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Soʻnggi 7 Kunlik Dinamika</h2>
        <div className="flex items-end justify-around h-48 gap-2">
          {stats?.timeline && stats.timeline.length > 0 ? (
            stats.timeline.map((day) => {
              const maxValue = Math.max(...(stats.timeline || []).map(t => Math.max(t.debts, t.payments)), 100000);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1 h-32 items-end w-full">
                    <div
                      className="flex-1 bg-blue-500 rounded-t hover:opacity-80 transition"
                      style={{ height: `${Math.max((day.debts / maxValue) * 100, 5)}%` }}
                      title={`Qarz: ${formatMoney(day.debts)}`}
                    />
                    <div
                      className="flex-1 bg-green-500 rounded-t hover:opacity-80 transition"
                      style={{ height: `${Math.max((day.payments / maxValue) * 100, 5)}%` }}
                      title={`Toʻlov: ${formatMoney(day.payments)}`}
                    />
                  </div>
                  <p className="text-xs text-gray-600 font-medium">{day.label}</p>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">Maʼlumotlar yoʻq</p>
          )}
        </div>
        <div className="flex gap-6 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Berilgan Qarz</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Qaytgan Toʻlov</span>
          </div>
        </div>
      </div>

      {/* Recent Stores Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Soʻnggi Ochilgan Doʻkonlar</h2>
            <p className="text-sm text-gray-600 mt-1">Tizimga yaqinda qoʻshilgan savdo nuqtalari</p>
          </div>
          <Link
            to="/admin/stores"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Barcha doʻkonlar →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Doʻkon Nomi</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Egasi</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Mijozlar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Sana</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats?.recentStores && stats.recentStores.length > 0 ? (
                stats.recentStores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{store.name}</p>
                        {store.address && <p className="text-xs text-gray-600">{store.address}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {store.ownerName}
                      {store.role === 'SUPER_ADMIN' && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{store.ownerPhone}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-medium">
                        {store.customerCount} ta
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(store.createdAt)}</td>
                    <td className="px-6 py-4">
                      {store.isBlocked ? (
                        <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded text-xs font-medium">
                          Bloklangan
                        </span>
                      ) : (
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded text-xs font-medium">
                          Faol
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Hozircha hech qanday doʻkon topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
