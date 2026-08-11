import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhoneIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  totalDebt: string;
  lastActivityAt: string;
}

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mijoz yaratish modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('+998');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/customers', {
        params: search ? { search } : {},
      });
      setCustomers(response.data);
    } catch (err: any) {
      setError('Mijozlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Kichik debounce/delay qidiruv uchun
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return;

    try {
      const phone = newCustomerPhone.length === 13 ? newCustomerPhone : undefined;
      await api.post('/customers', {
        fullName: newCustomerName,
        phoneNumber: phone,
      });
      setModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('+998');
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Mijoz qoʻshishda xatolik yuz berdi');
    }
  };

  const formatMoney = (amountStr: string) => {
    const amount = Number(amountStr);
    return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
  };

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Mijozlar bazasi</h1>
          <p className="text-sm text-gray-500">Mijozlar roʻyxati va umumiy balanslar</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 transition-all duration-200 text-sm"
        >
          <UserPlusIcon className="w-5 h-5 text-white" />
          <span>+ Yangi mijoz</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base shadow-sm transition-all duration-200"
          placeholder="Mijoz ismi yoki telefon raqami boʻyicha qidirish..."
        />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <ArrowPathIcon className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Qidirilmoqda...</p>
        </div>
      ) : (
        /* Customers List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-gray-500 font-medium">Mijozlar topilmadi.</p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-indigo-600 font-bold hover:underline text-sm"
                >
                  Qidiruvni tozalash
                </button>
              )}
            </div>
          ) : (
            customers.map((c) => {
              const debt = Number(c.totalDebt);
              return (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 flex items-center justify-between group"
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200 truncate">
                      {c.fullName}
                    </h3>
                    {c.phoneNumber ? (
                      <span className="text-xs font-semibold text-gray-500 flex items-center">
                        <PhoneIcon className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {c.phoneNumber}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Telefon kiritilmagan</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-base font-black ${
                          debt > 0 
                            ? 'text-red-600' 
                            : debt < 0 
                            ? 'text-emerald-600' 
                            : 'text-gray-400'
                        }`}
                      >
                        {formatMoney(c.totalDebt)}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-medium">Balans</span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-all duration-200" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Create Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  placeholder="+998901234567"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-200"
                >
                  Mijozni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
