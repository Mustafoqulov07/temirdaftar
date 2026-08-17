import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">Parol</label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Parolni unutdingizmi?
              </button>
            </div>
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

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-50 text-indigo-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Parolni tiklash</h3>
              <div className="text-sm text-gray-600 space-y-3 text-left">
                <p>
                  Xavfsizlik nuqtai nazaridan parolni qayta tiklash faqat <strong>“Temir Daftar” rasmiy Telegram boti</strong> orqali amalga oshiriladi.
                </p>
                <p>
                  Bunining uchun:
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Oʻzingiz roʻyxatdan oʻtgan Telegram botimizga kiring.</li>
                  <li>U yerda <strong><code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-600">/resetpassword</code></strong> buyrugʻini yuboring.</li>
                  <li>Bot soʻragan yangi parolni yozib yuboring va tasdiqlang.</li>
                </ol>
              </div>
            </div>
            <div className="pt-2 flex flex-col space-y-2">
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-200"
              >
                Telegram botni ochish
              </a>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
