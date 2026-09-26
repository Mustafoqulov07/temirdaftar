import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import { UserPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

/* ---------- Brend paneli (chap tomon, desktop) ---------- */
const BrandPanel: React.FC = () => (
  <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[52%] p-12 text-white relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950">
    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
    <div className="absolute bottom-0 -left-32 w-[28rem] h-[28rem] bg-violet-400/20 rounded-full blur-3xl" />

    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white text-indigo-700 flex items-center justify-center text-2xl font-black shadow-lg">
          T
        </div>
        <span className="text-xl font-bold tracking-tight">Temir Daftar</span>
      </div>
    </div>

    <div className="relative space-y-8">
      <h2 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight">
        Doʻkoningiz uchun
        <br />
        <span className="text-indigo-200">raqamli qarz daftari</span>
      </h2>
      <p className="text-indigo-100/90 text-base leading-relaxed max-w-md">
        Bir daqiqada hisob yarating — mijozlar, qarzlar va toʻlovlar darhol tartibga tushadi.
      </p>

      <ul className="space-y-4">
        {[
          'Bepul boshlang — karta talab qilinmaydi',
          'Mijozlar tarixi va qarz balanslari avtomatik hisoblanadi',
          'Telegram orqali eslatmalar yuboring',
        ].map((t) => (
          <li key={t} className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-300 shrink-0" />
            <span className="text-sm text-indigo-50">{t}</span>
          </li>
        ))}
      </ul>
    </div>

    <p className="relative text-xs text-indigo-200/60">© {new Date().getFullYear()} Temir Daftar — Magazinlar uchun raqamli qarz daftari</p>
  </div>
);

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, telegramRegData } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (telegramRegData) {
      setFullName(telegramRegData.fullName);
      setStoreName(`${telegramRegData.fullName} doʻkoni`);
    }
  }, [telegramRegData]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digits = val.replace(/\D/g, '');
    const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
    const valid9 = localDigits.slice(0, 9);
    setPhoneNumber('+998' + valid9);
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

    if (!telegramRegData && password.length < 6) {
      setError('Parol uzunligi kamida 6 ta belgidan iborat boʻlishi kerak');
      setLoading(false);
      return;
    }

    if (!telegramRegData && password !== confirmPassword) {
      setError('Parollar mos kelmadi. Iltimos, qayta kiriting.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        phoneNumber,
        password: password || undefined,
        fullName,
        storeName,
        telegramId: telegramRegData?.telegramId || undefined,
      });

      const { token, user: regUser, store: regStore } = response.data;

      // Token localStorage-ga saqlanadi
      localStorage.setItem('token', token);

      // User va store: javobda bo'lmasa /auth/profile dan olib kelamiz
      let user = regUser;
      let store = regStore;
      if (!user) {
        const profileRes = await api.get('/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        user = profileRes.data.user;
        store = profileRes.data.store;
      }

      // Token state-da saqlanadi, user/store faqat memory-da
      login(token, user, store);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        (err.response ? 'Roʻyxatdan oʻtishda xatolik yuz berdi. Iltimos, qayta urining.' : 'Internet ulanishini tekshiring.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <BrandPanel />

      {/* O'ng tomon — forma */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobil logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-200">
              T
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Temir Daftar</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-slate-800 p-8 sm:p-10 relative">
            <div className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              <ThemeToggle />
            </div>
            <div className="space-y-2 mb-8">
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Yangi hisob yaratish</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                “Temir Daftar” tizimida roʻyxatdan oʻting — bir daqiqada tayyor
              </p>
            </div>

            {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 animate-slide-in">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {telegramRegData && (
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6">
                <p className="text-xs font-semibold text-indigo-700">
                  🤖 Telegram orqali bogʻlandingiz! Roʻyxatdan oʻtishni yakunlash uchun telefon raqamingizni kiriting va doʻkoningiz nomini tasdiqlang.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Ism va Familiyangiz</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                  placeholder="Ali Valiyev"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Doʻkoningiz (magazin) nomi</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                  placeholder="Mahalla Oziq-ovqat Doʻkoni"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Telefon raqam</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                  placeholder="+998901234567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Parol {telegramRegData && <span className="text-gray-400 font-normal">(ixtiyoriy)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!telegramRegData}
                  className="w-full px-4 py-3 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                  placeholder={telegramRegData ? "Ixtiyoriy (veb-saytga kirish uchun)" : "Kamida 6 belgidan iborat parol"}
                />
              </div>

              {!telegramRegData && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Parolni tasdiqlash
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 text-base transition-all duration-200 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-400 dark:border-red-500 ring-2 ring-red-100 dark:ring-red-950'
                        : 'border-gray-300 dark:border-slate-700'
                    }`}
                    placeholder="Parolni qayta kiriting"
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">Parollar mos kelmadi</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Roʻyxatdan oʻtilmoqda...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-5 h-5" />
                    Roʻyxatdan oʻtish
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Akkauntingiz bormi?{' '}
                <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">
                  Tizimga kirish
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
