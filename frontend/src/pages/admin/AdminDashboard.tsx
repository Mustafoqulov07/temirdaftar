import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  BuildingStorefrontIcon,
  UsersIcon,
  PaperAirplaneIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ScaleIcon,
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
  const [hoveredDay, setHoveredDay] = useState<TimelineDay | null>(null);

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

  // Render trend badge with dynamic colors and arrows
  const renderTrendBadge = (trend?: TrendItem, label = "o'tgan oyga nisbatan") => {
    if (!trend) return null;

    if (trend.direction === 'neutral' || trend.percent === 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
          <MinusIcon className="w-3.5 h-3.5" />
          <span>0.0% Barqaror</span>
        </div>
      );
    }

    if (trend.direction === 'up') {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
          <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          <span>+{trend.percent}% Oʻsish</span>
          <span className="text-[10px] text-emerald-400/70 font-normal hidden sm:inline">({label})</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10">
        <ArrowTrendingDownIcon className="w-4 h-4 text-rose-400 stroke-[2.5]" />
        <span>-{trend.percent}% Pasayish</span>
        <span className="text-[10px] text-rose-400/70 font-normal hidden sm:inline">({label})</span>
      </div>
    );
  };

  // Max value calculation for 7-day chart normalization
  const maxChartValue = Math.max(
    ...(stats?.timeline || []).map((t) => Math.max(t.debts, t.payments)),
    100000
  );

  // Recovery Rate
  const totalDebts = stats?.totalDebtsSum || 0;
  const totalPayments = stats?.totalPaymentsSum || 0;
  const recoveryRate = totalDebts > 0 ? Math.min(Math.round((totalPayments / totalDebts) * 100), 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <SparklesIcon className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-400 text-sm font-semibold tracking-wide">
          Boshqaruv markazi va real trendlar yuklanmoqda...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/25 rounded-3xl text-center max-w-lg mx-auto my-12 backdrop-blur-xl">
        <ShieldExclamationIcon className="w-14 h-14 text-rose-400 mx-auto mb-3" />
        <h3 className="text-xl font-black text-rose-200 mb-1">Aloqa xatosi</h3>
        <p className="text-sm text-rose-300/80 mb-5 leading-relaxed">{error}</p>
        <button
          onClick={fetchStats}
          className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
              Jonli Monitoring & Trendlar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Tizim Nazorat Doskasi
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Doʻkonlar moliyaviy faolligi, kutilayotgan qoldiqlar va kunlik dinamika
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm"
          >
            <ArrowPathIcon className="w-4 h-4 text-indigo-400" />
            <span>Yangilash</span>
          </button>
          <Link
            to="/admin/broadcast"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            <span>Barchaga Xabar Yuborish</span>
          </Link>
        </div>
      </div>

      {/* Main Financial KPI with Up/Down Movement Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Debts */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl group hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BanknotesIcon className="w-4 h-4 text-indigo-400" />
              Jami Berilgan Qarzlar
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <ArrowTrendingUpIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-300 tracking-tight">
            {formatMoney(stats?.totalDebtsSum || 0)}
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80">
            {renderTrendBadge(stats?.trends.debts, '30 kunlik dinamika')}
            <span className="text-xs text-slate-500 font-mono">
              {stats?.debtsCount || 0} ta yozuv
            </span>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl group hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CurrencyDollarIcon className="w-4 h-4 text-emerald-400" />
              Jami Undirilgan Toʻlovlar
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            {formatMoney(stats?.totalPaymentsSum || 0)}
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80">
            {renderTrendBadge(stats?.trends.payments, '30 kunlik dinamika')}
            <span className="text-xs text-slate-500 font-mono">
              {stats?.paymentsCount || 0} ta toʻlov
            </span>
          </div>
        </div>

        {/* Total Outstanding Balance */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl group hover:border-amber-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ScaleIcon className="w-4 h-4 text-amber-400" />
              Kutilayotgan Qoldiq Balans
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <ScaleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
            {formatMoney(stats?.totalBalance || 0)}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${recoveryRate}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-300">{recoveryRate}%</span>
            </div>
            <span className="text-xs text-slate-400">Qaytarilish darajasi</span>
          </div>
        </div>
      </div>

      {/* 7-DAY DYNAMIC INTERACTIVE VISUAL TREND CHART */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-indigo-400" />
              Soʻnggi 7 Kunlik Moliyaviy Oqim & Tendensiya
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Qarzlar berilishi (koʻk) va Toʻlovlar qaytishi (yashil) har kunlik taqqoslanishi
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
              <span className="text-slate-300">Berilgan Qarz</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span className="text-slate-300">Qaytgan Toʻlov</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-56 border-b border-slate-800 pb-3">
            {stats?.timeline && stats.timeline.length > 0 ? (
              stats.timeline.map((day, idx) => {
                const debtHeight = Math.max(Math.round((day.debts / maxChartValue) * 100), day.debts > 0 ? 8 : 2);
                const paymentHeight = Math.max(Math.round((day.payments / maxChartValue) * 100), day.payments > 0 ? 8 : 2);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    {hoveredDay?.date === day.date && (
                      <div className="absolute -top-16 z-30 bg-slate-950 border border-slate-700 text-white rounded-xl p-2 text-[11px] shadow-2xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95">
                        <div className="font-bold text-slate-200 mb-0.5">{day.label}</div>
                        <div className="text-indigo-400">Qarz: {formatMoney(day.debts)}</div>
                        <div className="text-emerald-400">Toʻlov: {formatMoney(day.payments)}</div>
                      </div>
                    )}

                    {/* Bars Container */}
                    <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-full pb-1">
                      {/* Debts Bar */}
                      <div
                        style={{ height: `${debtHeight}%` }}
                        className="w-3 sm:w-6 bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-lg shadow-lg shadow-indigo-600/20 group-hover:brightness-125 transition-all duration-300"
                        title={`Qarz: ${formatMoney(day.debts)}`}
                      />
                      {/* Payments Bar */}
                      <div
                        style={{ height: `${paymentHeight}%` }}
                        className="w-3 sm:w-6 bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-lg shadow-lg shadow-emerald-500/20 group-hover:brightness-125 transition-all duration-300"
                        title={`Toʻlov: ${formatMoney(day.payments)}`}
                      />
                    </div>

                    {/* Day Label */}
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-2 truncate max-w-full group-hover:text-white transition-colors">
                      {day.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="col-span-7 text-center text-slate-500 py-16">
                Maʼlumotlar shakllanmoqda...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 px-1">
            <span>← 7 kun avval</span>
            <span className="font-mono text-indigo-400/90">Har bir kunlik oqim real bazadan hisoblanadi</span>
            <span>Bugun →</span>
          </div>
        </div>
      </div>

      {/* Quantitative Stats & Ecosystem Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stores */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Doʻkonlar Soni</span>
            <BuildingStorefrontIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{stats?.totalStores || 0}</p>
          <div className="mt-3">
            {renderTrendBadge(stats?.trends.stores, "yangi do'konlar")}
          </div>
        </div>

        {/* Customers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Jami Mijozlar</span>
            <UsersIcon className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{stats?.totalCustomers || 0}</p>
          <div className="mt-3">
            {renderTrendBadge(stats?.trends.customers, "mijozlar oqimi")}
          </div>
        </div>

        {/* Users */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Foydalanuvchilar</span>
            <UsersIcon className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{stats?.totalUsers || 0}</p>
          <p className="text-xs text-emerald-400 mt-2 font-medium">
            {stats?.activeUsers || 0} ta faol {stats?.blockedUsers ? `• ${stats.blockedUsers} bloklangan` : ''}
          </p>
        </div>

        {/* Telegram Integrations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Telegram Bot Ulanish</span>
            <PaperAirplaneIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-cyan-300 mt-2">{stats?.telegramUsersCount || 0}</p>
          <p className="text-xs text-slate-400 mt-2">
            Botga ulangan doʻkondorlar
          </p>
        </div>
      </div>

      {/* Recent Stores Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-white">Soʻnggi Ochilgan Doʻkonlar</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tizimga yaqinda qoʻshilgan savdo nuqtalari</p>
          </div>
          <Link
            to="/admin/stores"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition"
          >
            Barcha doʻkonlar boshqaruvi →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Doʻkon Nomi</th>
                <th className="px-4 py-3.5">Egasi</th>
                <th className="px-4 py-3.5">Telefon</th>
                <th className="px-4 py-3.5">Mijozlar</th>
                <th className="px-4 py-3.5">Sana</th>
                <th className="px-4 py-3.5">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats?.recentStores && stats.recentStores.length > 0 ? (
                stats.recentStores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-4 font-semibold text-white flex items-center gap-2.5">
                      <div className="p-2 bg-slate-800 rounded-xl text-indigo-400 border border-slate-700/60">
                        <BuildingStorefrontIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div>{store.name}</div>
                        {store.address && (
                          <div className="text-[11px] text-slate-500 font-normal">{store.address}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {store.ownerName}
                      {store.role === 'SUPER_ADMIN' && (
                        <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-400 font-mono text-xs">{store.ownerPhone}</td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-200 font-bold border border-slate-700/50">
                        {store.customerCount} ta mijoz
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-400 font-mono">{formatDate(store.createdAt)}</td>
                    <td className="px-4 py-4">
                      {store.isBlocked ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 text-xs font-bold border border-rose-500/30">
                          Bloklangan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                          Faol
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
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
