import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  LockOpenIcon,
  KeyIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface StoreItem {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    telegramId: string | null;
    isBlocked: boolean;
    role: string;
    createdAt: string;
  };
  customerCount: number;
  totalDebtSum: number;
  totalPaymentSum: number;
  balance: number;
}

interface StoreDetailData {
  store: {
    id: string;
    name: string;
    address: string | null;
    createdAt: string;
    user: {
      id: string;
      fullName: string;
      phoneNumber: string;
      telegramId: string | null;
      isBlocked: boolean;
      role: string;
    };
  };
  customers: Array<{
    id: string;
    serialId: number | null;
    fullName: string;
    phoneNumber: string | null;
    balance: number;
    totalDebt: number;
    totalPaid: number;
    debtsCount: number;
    paymentsCount: number;
  }>;
  recentDebts: Array<{
    id: string;
    customer: { fullName: string; phoneNumber: string | null };
    dueDate: string;
    comment: string | null;
    total: number;
    isPaid: boolean;
    createdAt: string;
  }>;
  recentPayments: Array<{
    id: string;
    customer: { fullName: string; phoneNumber: string | null };
    amount: number;
    comment: string | null;
    paymentDate: string;
  }>;
}

export const AdminStores: React.FC = () => {
  const { showToast } = useToast();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<StoreDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [passwordModalStore, setPasswordModalStore] = useState<StoreItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [blockConfirmStore, setBlockConfirmStore] = useState<StoreItem | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const fetchStores = async (query = '') => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stores', {
        params: query ? { search: query } : {},
      });
      setStores(res.data);
    } catch (err: any) {
      console.error('Error fetching stores:', err);
      showToast('Doʻkonlarni yuklashda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStores(search);
  };

  const handleOpenDetail = async (storeId: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/admin/stores/${storeId}`);
      setSelectedStoreDetail(res.data);
    } catch (err: any) {
      console.error('Error fetching store details:', err);
      showToast('Doʻkon tafsilotlarini yuklashda xatolik', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!blockConfirmStore) return;
    try {
      setBlockLoading(true);
      const res = await api.patch(`/admin/stores/${blockConfirmStore.id}/toggle-block`);
      showToast(res.data.message || 'Holat muvaffaqiyatli yangilandi', 'success');
      
      setStores((prev) =>
        prev.map((s) =>
          s.id === blockConfirmStore.id
            ? { ...s, user: { ...s.user, isBlocked: res.data.isBlocked } }
            : s
        )
      );
      setBlockConfirmStore(null);
    } catch (err: any) {
      console.error('Error toggling block:', err);
      showToast(err.response?.data?.message || 'Amalni bajarishda xatolik', 'error');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalStore) return;
    if (newPassword.trim().length < 6) {
      showToast('Parol kamida 6 ta belgidan iborat boʻlishi kerak', 'warning');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.post(`/admin/stores/${passwordModalStore.id}/reset-password`, {
        newPassword: newPassword.trim(),
      });
      showToast(res.data.message || 'Parol muvaffaqiyatli yangilandi', 'success');
      setPasswordModalStore(null);
      setNewPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showToast(err.response?.data?.message || 'Parolni yangilashda xatolik', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val || 0) + " so'm";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BuildingStorefrontIcon className="w-7 h-7 text-indigo-400" />
            Doʻkonlar va Foydalanuvchilar Boshqaruvi
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Barcha doʻkonlar roʻyxati, balanslar, bloklash va parollarni boshqarish
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Doʻkon nomi, egasi yoki telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
          >
            Qidirish
          </button>
        </form>
      </div>

      {/* Stores Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Doʻkon / Manzil</th>
                <th className="px-4 py-3.5">Egasi va Telefon</th>
                <th className="px-4 py-3.5">Mijozlar</th>
                <th className="px-4 py-3.5">Jami Qarz</th>
                <th className="px-4 py-3.5">Qoldiq Balans</th>
                <th className="px-4 py-3.5">Holat</th>
                <th className="px-4 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Hech qanday doʻkon topilmadi
                  </td>
                </tr>
              ) : (
                stores.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.address || 'Manzil koʻrsatilmagan'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Ochilgan: {formatDate(s.createdAt)}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-white font-medium flex items-center gap-1.5">
                        {s.user.fullName}
                        {s.user.role === 'SUPER_ADMIN' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{s.user.phoneNumber}</div>
                      {s.user.telegramId ? (
                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Telegram ulangan
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Telegram yoʻq
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200">
                        {s.customerCount} ta mijoz
                      </span>
                    </td>

                    <td className="px-4 py-4 text-xs font-medium text-slate-300">
                      <div>{formatMoney(s.totalDebtSum)}</div>
                      <div className="text-[11px] text-emerald-400">Toʻlangan: {formatMoney(s.totalPaymentSum)}</div>
                    </td>

                    <td className="px-4 py-4 font-bold text-xs">
                      <span className={s.balance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        {formatMoney(s.balance)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {s.user.isBlocked ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 text-xs font-semibold border border-rose-500/30 inline-flex items-center gap-1">
                          <LockClosedIcon className="w-3.5 h-3.5" />
                          Bloklangan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Faol
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(s.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 transition"
                          title="Batafsil koʻrish"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setPasswordModalStore(s);
                            setNewPassword('');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                          title="Parolni tiklash"
                        >
                          <KeyIcon className="w-4 h-4" />
                        </button>

                        {s.user.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setBlockConfirmStore(s)}
                            className={`p-1.5 rounded-lg transition ${
                              s.user.isBlocked
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                            }`}
                            title={s.user.isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
                          >
                            {s.user.isBlocked ? (
                              <LockOpenIcon className="w-4 h-4" />
                            ) : (
                              <LockClosedIcon className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {passwordModalStore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-amber-400" />
                Parolni Yangilash
              </h3>
              <button
                onClick={() => setPasswordModalStore(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Doʻkon: <strong className="text-white">{passwordModalStore.name}</strong> ({passwordModalStore.user.fullName})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Yangi Parol (kamida 6 ta belgi):
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="Masalan: YangiParol123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalStore(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {passwordLoading ? 'Saqlanmoqda...' : 'Parolni Oʻzgartirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Confirm Modal */}
      {blockConfirmStore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <ExclamationTriangleIcon className="w-8 h-8" />
              <h3 className="text-base font-bold text-white">
                {blockConfirmStore.user.isBlocked ? 'Blokdan chiqarish' : 'Doʻkonni Bloklash'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Haqiqatan ham <strong className="text-white">"{blockConfirmStore.name}"</strong> doʻkonini{' '}
              {blockConfirmStore.user.isBlocked ? 'blokdan chiqarmoqchimisiz?' : 'bloklamoqchimisiz? Bloklangan foydalanuvchi tizimga kira olmaydi.'}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockConfirmStore(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={blockLoading}
                onClick={handleToggleBlock}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 text-white ${
                  blockConfirmStore.user.isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {blockLoading ? 'Kutilmoqda...' : blockConfirmStore.user.isBlocked ? 'Ha, blokdan chiqarish' : 'Ha, bloklash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Detail Modal */}
      {(selectedStoreDetail || detailLoading) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 my-auto shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                  <BuildingStorefrontIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedStoreDetail?.store.name || 'Yuklanmoqda...'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Egasi: {selectedStoreDetail?.store.user.fullName} ({selectedStoreDetail?.store.user.phoneNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStoreDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Maʼlumotlar yuklanmoqda...
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 mt-4 space-y-6 pr-1">
                {/* Customers list */}
                <div>
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">
                    Mijozlar Roʻyxati ({selectedStoreDetail?.customers.length || 0} nafar)
                  </h4>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 sticky top-0 text-slate-400">
                        <tr>
                          <th className="px-3 py-2">№</th>
                          <th className="px-3 py-2">F.I.SH</th>
                          <th className="px-3 py-2">Telefon</th>
                          <th className="px-3 py-2">Jami Qarz</th>
                          <th className="px-3 py-2">Toʻlangan</th>
                          <th className="px-3 py-2">Qoldiq</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedStoreDetail?.customers.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-900/50">
                            <td className="px-3 py-2 font-mono text-slate-500">
                              {c.serialId ? `#${c.serialId}` : '-'}
                            </td>
                            <td className="px-3 py-2 font-medium text-white">{c.fullName}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{c.phoneNumber || '-'}</td>
                            <td className="px-3 py-2 text-rose-400">{formatMoney(c.totalDebt)}</td>
                            <td className="px-3 py-2 text-emerald-400">{formatMoney(c.totalPaid)}</td>
                            <td className="px-3 py-2 font-bold text-amber-400">{formatMoney(c.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Debts and Payments side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <h5 className="text-xs font-bold text-slate-300 mb-2">Soʻnggi Qarzlar</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedStoreDetail?.recentDebts.map((d) => (
                        <div key={d.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex justify-between">
                          <div>
                            <p className="font-semibold text-white">{d.customer.fullName}</p>
                            <p className="text-[11px] text-slate-400">{d.comment || 'Izohsiz'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-400">{formatMoney(d.total)}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(d.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedStoreDetail?.recentDebts || selectedStoreDetail.recentDebts.length === 0) && (
                        <p className="text-xs text-slate-500 text-center py-4">Qarzlar mavjud emas</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <h5 className="text-xs font-bold text-slate-300 mb-2">Soʻnggi Toʻlovlar</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedStoreDetail?.recentPayments.map((p) => (
                        <div key={p.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex justify-between">
                          <div>
                            <p className="font-semibold text-white">{p.customer.fullName}</p>
                            <p className="text-[11px] text-slate-400">{p.comment || "To'lov"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-400">{formatMoney(p.amount)}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(p.paymentDate)}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedStoreDetail?.recentPayments || selectedStoreDetail.recentPayments.length === 0) && (
                        <p className="text-xs text-slate-500 text-center py-4">Toʻlovlar mavjud emas</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
