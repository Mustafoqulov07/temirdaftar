import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  PhoneIcon,
  PlusIcon,
  MinusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ShoppingBagIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface CustomerDetailInfo {
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

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetailInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Forms state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [debtProduct, setDebtProduct] = useState('');
  const [debtQty, setDebtQty] = useState('1');
  const [debtPrice, setDebtPrice] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtComment, setDebtComment] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentComment, setPaymentComment] = useState('');

  const navigate = useNavigate();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    if (/^\d$/.test(val)) {
      setEditPhone('+998' + val);
      return;
    }
    
    if (!val.startsWith('+998')) {
      if (val.length < 4) {
        setEditPhone('+998');
        return;
      }
      val = '+998' + val.replace(/\D/g, '').slice(3);
    }
    
    const digits = val.slice(4).replace(/\D/g, '');
    if (digits.length <= 9) {
      setEditPhone('+998' + digits);
    }
  };

  const fetchCustomerDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');

    try {
      const response = await api.get(`/customers/${id}`);
      setCustomer(response.data.customer);
      setHistory(response.data.history);

      // Tahrirlash formasi uchun boshlang'ich ma'lumotlar
      setEditName(response.data.customer.fullName);
      setEditPhone(response.data.customer.phoneNumber || '+998');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Mijoz maʻlumotlarini yuklashda xatolik yuz berdi.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) return;

    try {
      const phone = editPhone.length === 13 ? editPhone : null;
      await api.put(`/customers/${id}`, {
        fullName: editName,
        phoneNumber: phone,
      });
      setEditModalOpen(false);
      fetchCustomerDetail(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tahrirlashda xatolik yuz berdi');
    }
  };

  const handleAddDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtProduct || !debtPrice || !debtDueDate) return;

    try {
      await api.post('/debts', {
        customerId: id,
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

      setDebtModalOpen(false);
      setDebtProduct('');
      setDebtQty('1');
      setDebtPrice('');
      setDebtDueDate('');
      setDebtComment('');
      fetchCustomerDetail(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Qarz qoʻshishda xatolik yuz berdi');
    }
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;

    try {
      await api.post('/payments', {
        customerId: id,
        amount: Number(paymentAmount),
        comment: paymentComment || undefined,
      });

      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentComment('');
      fetchCustomerDetail(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Toʻlov qabul qilishda xatolik yuz berdi');
    }
  };

  const handleDeleteCustomer = async () => {
    const confirmed = window.confirm(
      'Haqiqatan ham ushbu mijozni va uning barcha qarz/toʻlovlar tarixini oʻchirmoqchisiz? Bu amalni ortga qaytarib boʻlmaydi.'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/customers/${id}`);
      navigate('/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Mijozni oʻchirishda xatolik yuz berdi');
    }
  };

  const openDebtModal = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setDebtDueDate(defaultDate.toISOString().split('T')[0]);
    setDebtModalOpen(true);
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

  const getDebtStatus = (item: HistoryItem) => {
    if (item.isPaid) return { text: 'Toʻlangan', classes: 'bg-emerald-50 text-emerald-700' };
    if (!item.dueDate) return { text: 'Kutilmoqda', classes: 'bg-gray-100 text-gray-700' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.dueDate);
    if (isNaN(dueDate.getTime())) return { text: 'Kutilmoqda', classes: 'bg-gray-100 text-gray-700' };
    if (dueDate < today) {
      return { text: 'Muddati oʻtgan', classes: 'bg-red-50 text-red-700' };
    }
    return { text: 'Kutilmoqda', classes: 'bg-gray-100 text-gray-700' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Mijoz maʻlumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Back
        </Link>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
          <p className="text-red-700 font-medium">{error || 'Mijoz topilmadi.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <Link to="/customers" className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-indigo-600">
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Mijozlar
        </Link>
        <div className="flex space-x-2">
          <button
            onClick={() => setEditModalOpen(true)}
            className="p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all duration-200"
            title="Tahrirlash"
          >
            <PencilSquareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteCustomer}
            className="p-2 border border-red-100 text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200"
            title="Mijozni o'chirish"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Customer Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{customer.fullName}</h2>
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500 shrink-0" title="Mijoz ID raqami">
              ID: {customer.serialId}
            </span>
          </div>
          {customer.phoneNumber ? (
            <a href={`tel:${customer.phoneNumber}`} className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:underline">
              <PhoneIcon className="w-4 h-4 mr-1.5" />
              {customer.phoneNumber}
            </a>
          ) : (
            <p className="text-sm text-gray-400 italic">Telefon raqam kiritilmagan</p>
          )}
          <p className="text-xs text-gray-400 font-medium">Qoʻshilgan sana: {formatDate(customer.createdAt)}</p>
        </div>

        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-center min-w-[200px]">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Umumiy Qarz Balance</span>
          <span className={`text-2xl font-black mt-1 ${customer.totalDebt > 0 ? 'text-red-600' : customer.totalDebt < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {formatMoney(customer.totalDebt)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={openDebtModal}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md hover:shadow-indigo-200 transition-all duration-200 text-base"
        >
          <PlusIcon className="w-5 h-5 text-white" />
          <span>+ Qarz yozish</span>
        </button>
        <button
          onClick={() => setPaymentModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md hover:shadow-emerald-200 transition-all duration-200 text-base"
        >
          <MinusIcon className="w-5 h-5 text-white" />
          <span>+ Toʻlov qabul qilish</span>
        </button>
      </div>

      {/* History log */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Qarzlar va toʻlovlar tarixi</h3>

        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">Hozircha hech qanday tarix topilmadi.</p>
          ) : (
            history.map((item) => {
              const isDebt = item.type === 'DEBT';
              const status = isDebt ? getDebtStatus(item) : null;
              return (
                <div key={item.id} className="bg-gray-50/50 hover:bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200">
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDebt ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isDebt ? <ShoppingBagIcon className="w-6 h-6" /> : <CreditCardIcon className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-sm font-bold text-gray-900">
                          {isDebt ? 'Qarz' : 'Toʻlov qabul qilindi'}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">({formatDate(item.date)})</span>
                        {isDebt && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status?.classes}`}>
                            {status?.text}
                          </span>
                        )}
                      </div>
                      
                      {/* Products detail if it's a debt */}
                      {isDebt && item.items && item.items.length > 0 && (
                        <div className="text-xs text-gray-600 font-medium">
                          {item.items.map((prod, idx) => (
                            <div key={idx} className="flex items-center flex-wrap">
                              🛍️ <span className="font-bold text-gray-800 ml-1">{prod.productName}</span>: {prod.quantity} dona × {formatMoney(prod.pricePerUnit)}
                            </div>
                          ))}
                        </div>
                      )}

                      {item.comment && (
                        <p className="text-xs text-gray-500 italic font-medium">Izoh: {item.comment}</p>
                      )}

                      {isDebt && !item.isPaid && (
                        <p className="text-xs text-rose-600 font-semibold flex items-center">
                          📅 Toʻlash muddati: {formatDate(item.dueDate!)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-left md:text-right shrink-0">
                    <span className={`text-base font-black block ${isDebt ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isDebt ? '+' : '-'}{formatMoney(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* -------------------- MODALS -------------------- */}

      {/* Edit Customer Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Mijoz maʻlumotlarini tahrirlash</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mijoz ismi</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon raqami</label>
                <input
                  type="text"
                  value={editPhone}
                  onFocus={(e) => {
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  }}
                  onChange={handlePhoneChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  placeholder="+998901234567"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-200"
                >
                  Saqlash
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mahsulot nomi</label>
                <input
                  type="text"
                  required
                  value={debtProduct}
                  onChange={(e) => setDebtProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Izoh (ixtiyoriy)</label>
                <textarea
                  value={debtComment}
                  onChange={(e) => setDebtComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  rows={2}
                  placeholder="Eslatma yoki mahsulot tafsilotlari..."
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Toʻlov summasi (soʻmda)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Izoh (ixtiyoriy)</label>
                <textarea
                  value={paymentComment}
                  onChange={(e) => setPaymentComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  rows={2}
                  placeholder="To'lov usuli, naqd, karta va h.k."
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
