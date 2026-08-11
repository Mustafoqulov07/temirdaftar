import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Telefon raqamini faqat +998 va 9 ta raqam formatiga o'tkazish
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Faqat raqamlarni olish
    const digits = val.replace(/\D/g, '');
    // Agar 998 bilan boshlansa, uni olib tashlaymiz
    const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
    // Oxirgi 9 ta raqamni olamiz
    const last9 = localDigits.slice(-9);
    const result = '+998' + last9;
    if (result.length <= 13) {
      setPhoneNumber(result);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (phoneNumber.length !== 13) {
      setError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/login', {
        phoneNumber,
        password,
      });
      const { token, user, store } = response.data;
      login(token, user, store);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Tizimga kirishda xatolik yuz berdi. Iltimos, qayta urining.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-xl text-2xl font-black mb-2">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">“Temir Daftar” tizimiga kirish</h1>
          <p className="text-sm text-gray-500">Raqamli qarz daftaringizga kiring</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <p className="text-xs font-semibold text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefon raqam</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={handlePhoneChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-lg transition-all duration-200"
              placeholder="+998901234567"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Parol</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-lg transition-all duration-200"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Hisobingiz yoʻqmi?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
              Roʻyxatdan oʻtish
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
