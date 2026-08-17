import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  UserPlusIcon,
  PlusIcon,
  MinusIcon,
  PhoneIcon,
  ChevronRightIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  UsersIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

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

export const Dashboard: React.FC = () => {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Form states
  const [allCustomersList, setAllCustomersList] = useState<{ id: string; fullName: string }[]>([]);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('+998');

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [debtProduct, setDebtProduct] = useState('');
  const [debtQty, setDebtQty] = useState('1');
  const [debtPrice, setDebtPrice] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtComment, setDebtComment] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentComment, setPaymentComment] = useState('');



  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const response = await api.get('/stores/dashboard');
      setMetrics(response.data.metrics);
      setTopCustomers(response.data.topCustomers);
      setActivities(response.data.activities);
    } catch (err: any) {
      setError('Maʻlumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllCustomersForSelect = async () => {
    try {
      const response = await api.get('/customers');
      setAllCustomersList(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return;

    try {
      const phone = newCustomerPhone.length === 13 ? newCustomerPhone : undefined;
      await api.post('/customers', {
        fullName: newCustomerName,
        phoneNumber: phone,
      });
      showToast("Mijoz muvaffaqiyatli qo'shildi", 'success');
      setCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('+998');
      fetchDashboardData(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Mijoz qoʻshishda xatolik yuz berdi', 'error');
    }
  };

  const handleAddDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !debtProduct || !debtPrice || !debtDueDate) return;

    if (Number(debtPrice) > 999999999999.99) {
      showToast("Narx 999 999 999 999 so'mdan oshmasligi kerak", 'error');
      return;
    }

    if (Number(debtQty) > 999999.99) {
      showToast("Miqdor 999 999 dan oshmasligi kerak", 'error');
      return;
    }

    try {
      await api.post('/debts', {
        customerId: selectedCustomerId,
        items: [
          {
            productName: debtProduct,
            quantity: Number(debtQty),
            pricePerUnit: Number(debtPrice),
          },
        ],
        dueDate: debtDueDate ? new Date(debtDueDate).toISOString() : undefined,
        comment: debtComment || undefined,
      });

      showToast("Qarz muvaffaqiyatli yozildi", 'success');
      setDebtModalOpen(false);
      setSelectedCustomerId('');
      setDebtProduct('');
      setDebtQty('1');
      setDebtPrice('');
      setDebtDueDate('');
      setDebtComment('');
      fetchDashboardData(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Qarz qoʻshishda xatolik yuz berdi', 'error');
    }
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !paymentAmount) return;

    if (Number(paymentAmount) > 999999999999.99) {
      showToast("To'lov summasi 999 999 999 999 so'mdan oshmasligi kerak", 'error');
      return;
    }

    try {
      await api.post('/payments', {
        customerId: selectedCustomerId,
        amount: Number(paymentAmount),
        comment: paymentComment || undefined,
      });

      showToast("To'lov muvaffaqiyatli qabul qilindi", 'success');
      setPaymentModalOpen(false);
      setSelectedCustomerId('');
      setPaymentAmount('');
      setPaymentComment('');
      fetchDashboardData(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Toʻlov qabul qilishda xatolik yuz berdi', 'error');
    }
  };

  const openDebtModal = () => {
    fetchAllCustomersForSelect();
    // Default to'lov muddati: bugundan 7 kun keyin
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setDebtDueDate(defaultDate.toISOString().split('T')[0]);
    setDebtModalOpen(true);
  };

  const openPaymentModal = () => {
    fetchAllCustomersForSelect();
    setPaymentModalOpen(true);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Maʻlumotlar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-gray-500">Doʻkoningizning joriy holati va hisob-kitoblar</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : 'text-gray-500'}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Quick Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setCustomerModalOpen(true)}
          className="flex items-center justify-center space-x-2.5 bg-white border border-indigo-100 hover:border-indigo-200 text-indigo-700 font-bold py-4 px-6 rounded-2xl shadow-sm hover:shadow-indigo-50 hover:bg-indigo-50/30 transition-all duration-200 text-base"
        >
          <UserPlusIcon className="w-5 h-5 text-indigo-600" />
          <span>+ Mijoz qoʻshish</span>
        </button>
        <button
          onClick={openDebtModal}
          className="flex items-center justify-center space-x-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md hover:shadow-indigo-200 transition-all duration-200 text-base"
        >
          <PlusIcon className="w-5 h-5 text-white" />
          <span>+ Qarz yozish</span>
        </button>
        <button
          onClick={openPaymentModal}
          className="flex items-center justify-center space-x-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md hover:shadow-emerald-200 transition-all duration-200 text-base"
        >
          <MinusIcon className="w-5 h-5 text-white" />
          <span>+ Toʻlov qabul qilish</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jami mijozlar</span>
          <div className="flex items-baseline mt-2">
            <span className="text-2xl font-bold text-gray-900">{metrics?.totalCustomers}</span>
            <span className="text-xs font-medium text-gray-400 ml-1">ta</span>
          </div>
          <UsersIcon className="w-5 h-5 text-gray-400 mt-2 self-end" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jami qarzdorlik</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-red-600 truncate block">{formatMoney(metrics?.totalDebtSum || 0)}</span>
          </div>
          <ExclamationCircleIcon className="w-5 h-5 text-red-400 mt-2 self-end" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bugun tushgan toʻlovlar</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-emerald-600 truncate block">{formatMoney(metrics?.todayPaymentsSum || 0)}</span>
          </div>
          <BanknotesIcon className="w-5 h-5 text-emerald-400 mt-2 self-end" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Muddati oʻtgan</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-rose-700 truncate block">{formatMoney(metrics?.overdueDebtsSum || 0)}</span>
          </div>
          <ExclamationCircleIcon className="w-5 h-5 text-rose-500 mt-2 self-end" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bugun kutilayotgan</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-amber-600 truncate block">{formatMoney(metrics?.todayDebtsSum || 0)}</span>
          </div>
          <CalendarIcon className="w-5 h-5 text-amber-400 mt-2 self-end" />
        </div>
      </div>

      {/* Main Grid: Top Debtors vs Last Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Debtors card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Eng koʻp qarzdorlar</h2>
            <Link to="/customers" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
              <span>Barchasi</span>
              <ChevronRightIcon className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {topCustomers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Hozircha faol qarzdor mijozlar yoʻq.</p>
            ) : (
              topCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between py-3 hover:bg-gray-50/50 px-2 rounded-xl transition-all duration-200">
                  <div className="space-y-0.5">
                    <Link to={`/customers/${customer.id}`} className="text-sm font-bold text-gray-900 hover:underline">
                      {customer.fullName}
                    </Link>
                    {customer.phoneNumber ? (
                      <a href={`tel:${customer.phoneNumber}`} className="text-xs font-semibold text-gray-500 flex items-center hover:text-indigo-600">
                        <PhoneIcon className="w-3 h-3 mr-1" />
                        {customer.phoneNumber}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Telefon kiritilmagan</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-red-600 block">{formatMoney(customer.totalDebt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Oxirgi operatsiyalar card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Oxirgi qarz operatsiyalari</h2>

          <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Hozircha hech qanday tranzaksiya mavjud emas.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        act.type === 'DEBT' 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {act.type === 'DEBT' ? 'Qarz' : 'Toʻlov'}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{act.customerName}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {formatDate(act.date)} {act.comment && `• ${act.comment}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      act.type === 'DEBT' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {act.type === 'DEBT' ? '+' : '-'}{formatMoney(act.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* -------------------- MODALS -------------------- */}

      {/* Customer Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Yangi mijoz qoʻshish</h3>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mijozning toʻliq ismi</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Ism Familiya"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon raqami (ixtiyoriy)</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('+998')) val = '+998';
                    const cleaned = '+' + val.slice(1).replace(/\D/g, '');
                    if (cleaned.length <= 13) setNewCustomerPhone(cleaned);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="+998901234567"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-200"
                >
                  Qoʻshish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debt Modal */}
      {debtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Yangi qarz yozish</h3>
            <form onSubmit={handleAddDebtSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mijozni tanlang</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                >
                  <option value="">-- Mijozni tanlang --</option>
                  {allCustomersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mahsulot nomi</label>
                <input
                  type="text"
                  required
                  value={debtProduct}
                  onChange={(e) => setDebtProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Guruch, yogʻ, un va h.k."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Miqdori / Soni</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={debtQty}
                    onChange={(e) => setDebtQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Dona narxi (soʻmda)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={debtPrice}
                    onChange={(e) => setDebtPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="12000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Toʻlov muddati</label>
                <input
                  type="date"
                  required
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Izoh (ixtiyoriy)</label>
                <textarea
                  value={debtComment}
                  onChange={(e) => setDebtComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  rows={2}
                  placeholder="Qoʻshimcha eslatma yoki izoh..."
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDebtModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-200"
                >
                  Qarz yozish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Toʻlov qabul qilish</h3>
            <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mijozni tanlang</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                >
                  <option value="">-- Mijozni tanlang --</option>
                  {allCustomersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Toʻlov summasi (soʻmda)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Izoh (ixtiyoriy)</label>
                <textarea
                  value={paymentComment}
                  onChange={(e) => setPaymentComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  rows={2}
                  placeholder="Naqd, karta yoki boshqa izohlar..."
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-200"
                >
                  Toʻlovni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
