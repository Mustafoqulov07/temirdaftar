import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  BuildingStorefrontIcon,
  UsersIcon,
  CurrencyDollarIcon,
  PaperAirplaneIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Super Admin maʼlumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center max-w-lg mx-auto my-12">
        <ShieldExclamationIcon className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-200 mb-1">Xatolik yuz berdi</h3>
        <p className="text-sm text-rose-300/80 mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Title and Refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Tizim Umumiy Koʻrsatkichlari
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Barcha doʻkonlar, foydalanuvchilar va moliyaviy aylanmalar haqida real-vaqt maʼlumotlari
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Yangilash</span>
          </button>
          <Link
            to="/admin/broadcast"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            <span>Telegram Xabar Yuborish</span>
          </Link>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-5 opacity-10">
            <ArrowTrendingUpIcon className="w-20 h-20 text-indigo-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jami Yozilgan Qarzlar</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400 mt-2">
            {formatMoney(stats?.totalDebtsSum || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {stats?.debtsCount || 0} ta qarz yozuvi orqali
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-5 opacity-10">
            <CurrencyDollarIcon className="w-20 h-20 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jami Qaytgan Toʻlovlar</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
            {formatMoney(stats?.totalPaymentsSum || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {stats?.paymentsCount || 0} ta toʻlov tranzaksiyasi
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-5 opacity-10">
            <CurrencyDollarIcon className="w-20 h-20 text-amber-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jami Kutilayotgan Qoldiq</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2">
            {formatMoney(stats?.totalBalance || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Doʻkonlar boʻyicha jami qoldiq qarz
          </p>
        </div>
      </div>

      {/* Quantitative Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Doʻkonlar</span>
            <BuildingStorefrontIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats?.totalStores || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Roʻyxatdagi doʻkonlar</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Foydalanuvchilar</span>
            <UsersIcon className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats?.totalUsers || 0}</p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {stats?.activeUsers || 0} faol {stats?.blockedUsers ? `• ${stats.blockedUsers} bloklangan` : ''}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Jami Mijozlar</span>
            <UsersIcon className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats?.totalCustomers || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Qarz daftaridagi xaridorlar</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Telegram Bot</span>
            <PaperAirplaneIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats?.telegramUsersCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Botga ulangan doʻkondorlar</p>
        </div>
      </div>

      {/* Recent Stores Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Soʻnggi Roʻyxatdan Oʻtgan Doʻkonlar</h2>
            <p className="text-xs text-slate-400">Yaqinda ochilgan doʻkonlar va ularning faolligi</p>
          </div>
          <Link
            to="/admin/stores"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Barchasini koʻrish →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Doʻkon Nomi</th>
                <th className="px-4 py-3">Egasi</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Mijozlar</th>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats?.recentStores && stats.recentStores.length > 0 ? (
                stats.recentStores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-medium text-white flex items-center gap-2">
                      <span className="p-1.5 bg-slate-800 rounded-lg text-indigo-400">
                        <BuildingStorefrontIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <div>{store.name}</div>
                        {store.address && (
                          <div className="text-[11px] text-slate-500">{store.address}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {store.ownerName}
                      {store.role === 'SUPER_ADMIN' && (
                        <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{store.ownerPhone}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-300 font-medium">
                        {store.customerCount} ta
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(store.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      {store.isBlocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium border border-rose-500/20">
                          Bloklangan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          Faol
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
