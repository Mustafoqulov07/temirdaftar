import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ArrowPathIcon,
  PaperAirplaneIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  SparklesIcon,
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
    return new Intl.NumberFormat('uz-UZ').format(val || 0);
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
  const maxChartValue = Math.max(
    ...(stats?.timeline || []).map((t) => Math.max(t.debts, t.payments)),
    100000
  );

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
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Boshqaruv Markazi
          </h1>
          <p className="text-gray-600 text-sm mt-2">Tizim faoliyatining real-time analitikasi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:border-blue-300 transition font-medium text-blue-700 hover:text-blue-800"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Yangilash
          </button>
          <Link
            to="/admin/broadcast"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition font-medium shadow-lg shadow-blue-600/30"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Xabar Yuborish
          </Link>
        </div>
      </div>

      {/* Main KPI Cards - Glassmorphism Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Debts */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-8 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full opacity-10 group-hover:opacity-20 transition -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Berilgan Qarzlar</span>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-blue-900 mb-2">{formatMoney(stats?.totalDebtsSum || 0)}</p>
            <p className="text-sm text-blue-700">
              <span className="font-bold">{stats?.debtsCount || 0}</span> ta yozuv
            </p>
            {stats?.trends.debts && (
              <div className="mt-3 flex items-center gap-1">
                <span className={`text-xs font-bold ${stats.trends.debts.direction === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.trends.debts.direction === 'up' ? '↑' : '↓'} {stats.trends.debts.percent}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Total Payments */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 p-8 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full opacity-10 group-hover:opacity-20 transition -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Undirilgan Toʻlovlar</span>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white">
                <ArrowUpIcon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-green-900 mb-2">{formatMoney(stats?.totalPaymentsSum || 0)}</p>
            <p className="text-sm text-green-700">
              <span className="font-bold">{stats?.paymentsCount || 0}</span> ta toʻlov
            </p>
            {stats?.trends.payments && (
              <div className="mt-3 flex items-center gap-1">
                <span className={`text-xs font-bold ${stats.trends.payments.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.trends.payments.direction === 'up' ? '↑' : '↓'} {stats.trends.payments.percent}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Balance with Progress */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200 p-8 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400 rounded-full opacity-10 group-hover:opacity-20 transition -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-orange-700 uppercase tracking-wider">Qoldiq Balans</span>
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                <SparklesIcon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-orange-900 mb-4">{formatMoney(stats?.totalBalance || 0)}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-orange-700">Qaytarilish Darajasi</span>
                <span className="font-black text-orange-900">{recoveryRate}%</span>
              </div>
              <div className="h-3 bg-orange-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000 ease-out"
                  style={{ width: `${recoveryRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Chart - 7 Day Trend */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-black mb-2">Soʻnggi 7 Kunlik Tendensiya</h2>
        <p className="text-slate-400 text-sm mb-6">Qarz va toʻlov oqimining kunlik dinamikasi</p>

        <div className="space-y-6">
          {/* Legend */}
          <div className="flex gap-8 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500 shadow-lg shadow-blue-500/50"></div>
              <span>Berilgan Qarz</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500 shadow-lg shadow-green-500/50"></div>
              <span>Qaytgan Toʻlov</span>
            </div>
          </div>

          {/* Chart Bars */}
          <div className="flex items-end justify-around gap-3 h-64 pt-4">
            {stats?.timeline && stats.timeline.length > 0 ? (
              stats.timeline.map((day, idx) => {
                const debtPercent = (day.debts / maxChartValue) * 100;
                const paymentPercent = (day.payments / maxChartValue) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group cursor-pointer">
                    <div className="w-full flex gap-1 items-end h-full mb-2">
                      {/* Debt Bar */}
                      <div className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-500 hover:to-blue-300 shadow-lg shadow-blue-600/50 relative group/bar"
                          style={{ height: `${Math.max(debtPercent, 5)}%` }}
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition pointer-events-none">
                            {formatMoney(day.debts)}
                          </div>
                        </div>
                      </div>

                      {/* Payment Bar */}
                      <div className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all hover:from-green-500 hover:to-green-300 shadow-lg shadow-green-600/50 relative group/bar"
                          style={{ height: `${Math.max(paymentPercent, 5)}%` }}
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition pointer-events-none">
                            {formatMoney(day.payments)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 group-hover:text-white transition mt-2">{day.label}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500">Maʼlumotlar yoʻq</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Doʻkonlar", value: stats?.totalStores || 0, color: "from-blue-500 to-blue-600", icon: "🏪" },
          { label: "Mijozlar", value: stats?.totalCustomers || 0, color: "from-green-500 to-green-600", icon: "👥" },
          { label: "Foydalanuvchilar", value: stats?.totalUsers || 0, color: "from-purple-500 to-purple-600", icon: "👤" },
          { label: "Telegram Ulanishlari", value: stats?.telegramUsersCount || 0, color: "from-cyan-500 to-cyan-600", icon: "✈️" },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xl">{stat.icon}</p>
              <span className="text-3xl opacity-10">•</span>
            </div>
            <p className="text-sm font-semibold opacity-80">{stat.label}</p>
            <p className="text-3xl font-black mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Stores Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">Soʻnggi Ochilgan Doʻkonlar</h2>
              <p className="text-sm text-gray-600 mt-1">Tizimga yaqinda qoʻshilgan savdo nuqtalari</p>
            </div>
            <Link
              to="/admin/stores"
              className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition"
            >
              Barcha doʻkonlar →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Doʻkon</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Egasi</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Telefon</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Mijozlar</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Sana</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recentStores && stats.recentStores.length > 0 ? (
                stats.recentStores.map((store, idx) => (
                  <tr key={store.id} className="hover:bg-blue-50 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{store.name}</p>
                          {store.address && <p className="text-xs text-gray-600">{store.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">{store.ownerName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{store.ownerPhone}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-bold">
                        {store.customerCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(store.createdAt)}</td>
                    <td className="px-6 py-4">
                      {store.isBlocked ? (
                        <span className="bg-red-100 text-red-800 px-3 py-1.5 rounded-full text-sm font-bold">
                          Bloklangan
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-bold">
                          Faol
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-semibold">
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
