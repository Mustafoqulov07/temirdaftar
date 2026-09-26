import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import TrendAreaChart, { type TrendPoint } from '../../components/TrendAreaChart';
import {
  ArrowPathIcon,
  PaperAirplaneIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

interface TrendItem {
  percent: number;
  direction: 'up' | 'down' | 'neutral';
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
  timeline: Array<{ date: string; label: string; debts: number; payments: number }>;
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

/** Trend badge — yuqoriga/qiizga belgisi */
const TrendBadge: React.FC<{ trend?: TrendItem; invert?: boolean }> = ({ trend, invert }) => {
  if (!trend || trend.direction === 'neutral') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
        <MinusIcon className="w-3.5 h-3.5" /> 0%
      </span>
    );
  }
  const isUp = trend.direction === 'up';
  // invert: qarz oshishi "yomon" — qizil ko'rsatiladi
  const good = invert ? !isUp : isUp;
  const Icon = isUp ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${
        good
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {trend.percent}%
    </span>
  );
};

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

  const formatMoney = (val: number) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const totalDebts = stats?.totalDebtsSum || 0;
  const totalPayments = stats?.totalPaymentsSum || 0;
  const recoveryRate = totalDebts > 0 ? Math.min(Math.round((totalPayments / totalDebts) * 100), 100) : 0;
  const trendPoints: TrendPoint[] = (stats?.timeline || []).map((t) => ({
    label: t.label,
    debts: t.debts,
    payments: t.payments,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
        <p className="text-rose-400 mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold transition"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Berilgan Qarzlar',
      value: formatMoney(stats?.totalDebtsSum || 0),
      sub: `${stats?.debtsCount || 0} ta yozuv`,
      icon: BanknotesIcon,
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      trend: stats?.trends.debts,
      invert: true,
    },
    {
      label: 'Undirilgan Toʻlovlar',
      value: formatMoney(stats?.totalPaymentsSum || 0),
      sub: `${stats?.paymentsCount || 0} ta toʻlov`,
      icon: ArrowUpIcon,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      trend: stats?.trends.payments,
      invert: false,
    },
    {
      label: 'Qoldiq Balans',
      value: formatMoney(stats?.totalBalance || 0),
      sub: `Undirish darajasi ${recoveryRate}%`,
      icon: ScaleIcon,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      trend: undefined,
      invert: false,
    },
  ];

  const quickStats = [
    { label: 'Doʻkonlar', value: stats?.totalStores || 0, icon: '🏪', trend: stats?.trends.stores },
    { label: 'Mijozlar', value: stats?.totalCustomers || 0, icon: '👥', trend: stats?.trends.customers },
    { label: 'Foydalanuvchilar', value: stats?.totalUsers || 0, icon: '👤', trend: undefined },
    { label: 'Telegram Ulanishlar', value: stats?.telegramUsersCount || 0, icon: '✈️', trend: undefined },
  ];

  return (
    <div className="space-y-7 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Boshqaruv Markazi
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">Tizim faoliyatining real vaqtli analitikasi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition font-semibold text-slate-300 hover:text-white text-xs"
          >
            <ArrowPathIcon className="w-4 h-4 text-indigo-400" />
            Yangilash
          </button>
          <Link
            to="/admin/broadcast"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl transition font-semibold text-xs shadow-lg shadow-indigo-600/20"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Xabar Yuborish
          </Link>
        </div>
      </div>

      {/* KPI Cards — yagona dark uslub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300 group"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/10 blur-2xl transition" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${kpi.accent}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-white tracking-tight">{kpi.value}</p>
              <div className="mt-2 flex items-center gap-2">
                <TrendBadge trend={kpi.trend} invert={kpi.invert} />
                <span className="text-xs text-slate-500">{kpi.sub}</span>
              </div>
              {kpi.label === 'Qoldiq Balans' && (
                <div className="mt-4 space-y-1.5">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${recoveryRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TradingView-uslubidagi tendensiya grafigi */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-indigo-400" />
              Soʻnggi 7 Kunlik Tendensiya
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Qarz va toʻlov oqimining kunlik dinamikasi (tolqin diagramma)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-indigo-500" /> Berilgan qarz
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-emerald-500" /> Qaytgan toʻlov
            </span>
          </div>
        </div>
        <TrendAreaChart data={trendPoints} height={280} formatValue={(v) => formatMoney(v)} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 hover:border-slate-700 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{s.icon}</span>
              <TrendBadge trend={s.trend} />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-black text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Stores Table */}
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white">Soʻnggi Ochilgan Doʻkonlar</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tizimga yaqinda qoʻshilgan savdo nuqtalari</p>
          </div>
          <Link
            to="/admin/stores"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-4 py-2 rounded-xl transition text-center"
          >
            Barcha doʻkonlar →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 border-b border-slate-800">
              <tr>
                {['Doʻkon', 'Egasi', 'Telefon', 'Mijozlar', 'Sana', 'Holat'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stats?.recentStores && stats.recentStores.length > 0 ? (
                stats.recentStores.map((store, idx) => (
                  <tr key={store.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{store.name}</p>
                          {store.address && <p className="text-[11px] text-slate-500">{store.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">{store.ownerName}</td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-400">{store.ownerPhone}</td>
                    <td className="px-5 py-4">
                      <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                        {store.customerCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">{formatDate(store.createdAt)}</td>
                    <td className="px-5 py-4">
                      {store.isBlocked ? (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                          Bloklangan
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                          Faol
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-semibold">
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
