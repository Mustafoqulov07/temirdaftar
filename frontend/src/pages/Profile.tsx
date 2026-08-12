import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  UserCircleIcon,
  ArrowLeftStartOnRectangleIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

export const Profile: React.FC = () => {
  const { user, store, login, logout } = useAuth();
  const navigate = useNavigate();

  // State values
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form values
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword] = useState('');

  // Load profile data from the backend to get all fields
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setFetchLoading(true);
        const response = await api.get('/auth/profile');
        const data = response.data;
        
        // Reset states with current data
        setFullName(data.user.fullName || '');
        setPhoneNumber(data.user.phoneNumber || '');
        setStoreName(data.store?.name || '');
        setStoreAddress(data.store?.address || '');
        setTelegramId(data.user.telegramId || '');
      } catch (err: any) {
        console.error('Profil maʼlumotlarini yuklashda xatolik:', err);
        setError('Profil maʼlumotlarini yuklab boʻlmadi.');
        
        // Fallback to auth context
        if (user) {
          setFullName(user.fullName || '');
          setPhoneNumber(user.phoneNumber || '');
          setTelegramId(user.telegramId || '');
        }
        if (store) {
          setStoreName(store.name || '');
          setStoreAddress(store.address || '');
        }
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProfile();
  }, [user, store]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digits = val.replace(/\D/g, '');
    const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
    const last9 = localDigits.slice(-9);
    const result = '+998' + last9;
    if (result.length <= 13) {
      setPhoneNumber(result);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setPassword('');
    
    // Reset to current values
    if (user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setTelegramId(user.telegramId || '');
    }
    if (store) {
      setStoreName(store.name || '');
      setStoreAddress(store.address || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (phoneNumber.length !== 13) {
      setError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      setLoading(false);
      return;
    }

    if (password && password.length < 6) {
      setError('Yangi parol kamida 6 ta belgidan iborat boʻlishi kerak');
      setLoading(false);
      return;
    }

    try {
      const response = await api.patch('/auth/profile', {
        fullName,
        phoneNumber,
        storeName,
        storeAddress: storeAddress || undefined,
        telegramId: telegramId || undefined,
        password: password || undefined,
      });

      const { token: newToken, user: updatedUser, store: updatedStore } = response.data;
      
      // Update global auth context
      login(newToken, updatedUser, updatedStore);
      
      setSuccess('Profil maʼlumotlari muvaffaqiyatli saqlandi!');
      setIsEditing(false);
      setPassword('');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Profilni saqlashda xatolik yuz berdi. Iltimos, qayta urining.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Sozlamalar</h1>
        <p className="text-sm text-gray-500">Tizim va doʻkon sozlamalarini boshqaring</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm">
          <p className="text-sm font-semibold text-emerald-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {!isEditing ? (
        // VIEW MODE
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
            {/* Store Information */}
            <div className="p-6 flex items-start space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <span className="text-xl">🏬</span>
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Doʻkon maʼlumotlari</span>
                <h3 className="text-lg font-bold text-gray-900">{store?.name}</h3>
                {storeAddress ? (
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPinIcon className="w-4 h-4 mr-1 text-gray-400 shrink-0" />
                    {storeAddress}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Doʻkon manzili belgilanmagan</p>
                )}
              </div>
            </div>

            {/* User Information */}
            <div className="p-6 flex items-start space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <UserCircleIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Foydalanuvchi maʼlumotlari</span>
                <h3 className="text-lg font-bold text-gray-900">{user?.fullName}</h3>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <span className="mr-1.5 text-gray-400">📞</span>
                  {user?.phoneNumber}
                </p>
                <p className="text-sm text-gray-600 flex items-center mt-1.5">
                  <span className="mr-1.5 text-gray-400">🤖</span>
                  {telegramId ? (
                    <span>Telegram ID: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-xs">{telegramId}</span></span>
                  ) : (
                    <span className="text-gray-400 italic">Telegram ID bogʻlanmagan</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all duration-200 text-base"
            >
              <PencilSquareIcon className="w-5 h-5 text-white" />
              <span>Profilni tahrirlash</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold py-4 px-6 rounded-2xl shadow-sm transition-all duration-200 text-base"
            >
              <ArrowLeftStartOnRectangleIcon className="w-5 h-5 text-red-600" />
              <span>Tizimdan chiqish</span>
            </button>
          </div>
        </div>
      ) : (
        // EDIT MODE FORM
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Maʼlumotlarni oʻzgartirish</h2>
              <p className="text-xs text-gray-400">Kerakli maydonlarni toʻldiring va saqlang</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ism va Familiyangiz</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                placeholder="Ali Valiyev"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefon raqam</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                placeholder="+998901234567"
              />
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doʻkon nomi</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                placeholder="Doʻkon nomi"
              />
            </div>

            {/* Store Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doʻkon manzili (ixtiyoriy)</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                placeholder="Toshkent sh., Yunusobod tumani"
              />
            </div>

            {/* Telegram ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telegram ID (ixtiyoriy)</label>
              <input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                placeholder="123456789"
              />
              <p className="text-[11px] text-gray-400 mt-1">Telegram bot orqali bildirishnomalarni olish uchun</p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Yangi parol (ixtiyoriy)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                placeholder="Kamida 6 belgidan iborat yangi parol"
              />
              <p className="text-[11px] text-gray-400 mt-1">Oʻzgartirmaslik uchun boʻsh qoldiring</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckIcon className="w-5 h-5 text-white" />
              <span>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold py-4 px-6 rounded-2xl shadow-sm transition-all duration-200 text-base disabled:opacity-50"
            >
              <XMarkIcon className="w-5 h-5 text-gray-700" />
              <span>Bekor qilish</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
