import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { setApiToken } from '../services/api';
import OtpInput from '../components/OtpInput';
import ThemeToggle from '../components/ThemeToggle';
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BellAlertIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

/* ---------- Brend paneli (chap tomon, desktop) ---------- */
const BrandPanel: React.FC<{ subtitle: string }> = ({ subtitle }) => (
  <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[52%] p-12 text-white relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950">
    {/* Dekorativ shakllar */}
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
        Qarzlaringizni
        <br />
        <span className="text-indigo-200">bir joyda boshqaring</span>
      </h2>
      <p className="text-indigo-100/90 text-base leading-relaxed max-w-md">{subtitle}</p>

      <ul className="space-y-4">
        {[
          { icon: ChartBarIcon, title: 'Real vaqtli statistika', desc: 'Qarzdorlik, toʻlovlar va muddati oʻtganlar bir ekranda' },
          { icon: ShieldCheckIcon, title: 'Xavfsiz va ishonchli', desc: 'Maʼlumotlaringiz shifrlangan holda saqlanadi' },
          { icon: BellAlertIcon, title: 'Telegram eslatmalar', desc: 'Toʻlov muddati yaqinlashganda bot xabar beradi' },
        ].map((f) => (
          <li key={f.title} className="flex items-start gap-4">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
              <f.icon className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <p className="font-bold text-sm">{f.title}</p>
              <p className="text-xs text-indigo-200/80 mt-0.5">{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>

    <p className="relative text-xs text-indigo-200/60">© {new Date().getFullYear()} Temir Daftar — Magazinlar uchun raqamli qarz daftari</p>
  </div>
);

/** Backend javobida botUrl bo'lmasa — standart bot havolasi */
const buildBotUrlFallback = () => `https://t.me/${(import.meta.env.VITE_BOT_USERNAME || 'qarzni_uzbot').replace(/^@/, '')}?start=auth`;

export const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [supportInfo, setSupportInfo] = useState<{ phone: string; telegram: string }>({
    phone: '',
    telegram: '',
  });

  // Telegram OTP oqimi holatlari
  const [otpMode, setOtpMode] = useState(false);
  const [otpId, setOtpId] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [botNotStarted, setBotNotStarted] = useState<string | null>(null);
  const [otpRequesting, setOtpRequesting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const applyAuthResult = (data: { token: string; user?: any; store?: any }) => {
    const { token } = data;
    if (!token) return false;
    setApiToken(token);
    const finish = (u: any, s: any) => {
      login(token, u, s);
      if (u?.role === 'SUPER_ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    };
    if (data.user) finish(data.user, data.store);
    else {
      api
        .get('/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => finish(res.data.user, res.data.store))
        .catch(() => setError('Foydalanuvchi maʼlumotlarini olishda xatolik'));
    }
    return true;
  };

  /** Telegram OTP so'rovi — BOT_NOT_STARTED holatini ham qayta ishlaydi */
  const requestTelegramOtp = async () => {
    setError('');
    setOtpError('');
    setBotNotStarted(null);
    if (phoneNumber.length !== 13) {
      setError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      return;
    }
    setOtpRequesting(true);
    try {
      const res = await api.post('/otp/request', {
        phoneNumber,
        purpose: 'LOGIN',
      });
      if (res.data?.status === 'BOT_NOT_STARTED') {
        // Kod yaratildi, lekin bot hali /start qilmagan — OTP ekrani + bot havolasi ko'rsatamiz
        setOtpId(res.data.otpId);
        setOtpExpiresAt(res.data.expiresAt);
        setBotNotStarted(res.data.botUrl || buildBotUrlFallback());
        setOtpMode(true);
        return;
      }
      setOtpId(res.data.otpId);
      setOtpExpiresAt(res.data.expiresAt);
      setOtpMode(true);
      showToast('Kod Telegram botga yuborildi', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response ? err.message : 'Internet ulanishini tekshiring.');
      if (err.response?.status === 429) setOtpError(msg || 'Juda koʻp urinish. Keyinroq qayta urinib koʻring.');
      else setError(msg || 'Kod yuborishda xatolik yuz berdi');
    } finally {
      setOtpRequesting(false);
    }
  };

  const handleOtpComplete = async (code: string) => {
    setOtpError('');
    setOtpVerifying(true);
    try {
      const res = await api.post('/otp/verify', { otpId, code });
      if (res.data?.verified && res.data?.token) {
        applyAuthResult(res.data);
      } else {
        setOtpError('Kod tasdiqlandi, lekin kirish amalga oshmadi. Qayta urinib koʻring.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || (err.response ? err.message : 'Internet ulanishini tekshiring.');
      setOtpError(msg || 'Kod notoʻgʻri.');
      if (status === 400 && msg?.includes('muddati')) {
        // Kod eskirgan — yangi OTP so'raymiz
        setOtpMode(false);
        setOtpId('');
        setBotNotStarted(null);
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  // Reset password states
  const [resetStep, setResetStep] = useState(1);
  const [resetPhone, setResetPhone] = useState('+998');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Telefon raqamini to'g'ri shaklda saqlash: faqat dastlabki 9 ta raqam
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

    try {
      const response = await api.post('/auth/login', {
        phoneNumber,
        password,
      });

      const { token } = response.data;
      if (!token) {
        setError('Tizimga kirishda xatolik yuz berdi. Iltimos, qayta urining.');
        setLoading(false);
        return;
      }

      // setApiToken localStorage'ni ham yangilaydi
      setApiToken(token);

      // Backend ba'zi versiyalarida javobda user/store yo'q —
      // bo'lmasa /auth/profile orqali olib kelamiz
      let user = response.data.user;
      let store = response.data.store;
      if (!user) {
        const profileRes = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        user = profileRes.data.user;
        store = profileRes.data.store;
      }

      login(token, user, store);

      applyAuthResult({ token, user, store });
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.data?.message?.includes('bloklangan')) {
        setSupportInfo({
          phone: err.response?.data?.supportPhone || '',
          telegram: err.response?.data?.supportTelegram || '',
        });
        setBlockedModalOpen(true);
      }
      setError(
        err.response?.data?.message ||
        (err.response ? 'Tizimga kirishda xatolik yuz berdi. Iltimos, qayta urining.' : 'Internet ulanishini tekshiring.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digits = val.replace(/\D/g, '');
    const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
    const valid9 = localDigits.slice(0, 9);
    setResetPhone('+998' + valid9);
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    if (resetPhone.length !== 13) {
      setResetError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      setResetLoading(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password', {
        phoneNumber: resetPhone,
      });
      showToast("Tasdiqlash kodi Telegram botingizga yuborildi", 'success');
      setResetStep(2);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Kodni yuborishda xatolik yuz berdi');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    if (resetCode.length !== 6) {
      setResetError('Tasdiqlash kodi 6 ta raqamdan iborat boʻlishi kerak');
      setResetLoading(false);
      return;
    }

    if (resetNewPassword.length < 6) {
      setResetError('Yangi parol kamida 6 ta belgidan iborat boʻlishi kerak');
      setResetLoading(false);
      return;
    }

    try {
      await api.post('/auth/reset-password', {
        phoneNumber: resetPhone,
        code: resetCode,
        newPassword: resetNewPassword,
      });
      showToast("Parolingiz muvaffaqiyatli tiklandi!", 'success');
      setForgotModalOpen(false);
      // Reset state fields
      setResetStep(1);
      setResetPhone('+998');
      setResetCode('');
      setResetNewPassword('');
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Parolni tiklashda xatolik yuz berdi');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <BrandPanel subtitle="Doʻkoningizdagi barcha qarz va toʻlovlarni Temir Daftar bilan tartibli, aniq va xavfsiz yuriting. Har bir mijoz tarixi bir joyda." />

      {/* O'ng tomon — forma */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          {/* Mobil logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-200">
              T
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Temir Daftar</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-slate-800 p-8 sm:p-10">
            <div className="space-y-2 mb-8">
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Tizimga kirish</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Hisobingizga kirish uchun telefon raqam va parolingizni kiriting
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 animate-slide-in">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {otpMode ? (
              <OtpInput
                purpose="LOGIN"
                expiresAt={otpExpiresAt}
                verifying={otpVerifying}
                error={otpError}
                onComplete={handleOtpComplete}
                onResend={requestTelegramOtp}
                onBack={() => {
                  setOtpMode(false);
                  setOtpError('');
                  setBotNotStarted(null);
                }}
              />
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
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
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Parol</label>
                      <button
                        type="button"
                        onClick={() => setForgotModalOpen(true)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">Parolni unutdingizmi?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-base transition-all duration-200"
                      placeholder="••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                  >
                    {loading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Kirilmoqda...
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="w-5 h-5" />
                        Kirish
                      </>
                    )}
                  </button>
                </form>

                {/* Telegram OTP varianti */}
                <div className="mt-6">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-gray-100 dark:bg-slate-800" />
                    <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      yoki
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={requestTelegramOtp}
                    disabled={otpRequesting}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#229ED9]/10 dark:bg-[#229ED9]/15 hover:bg-[#229ED9]/20 dark:hover:bg-[#229ED9]/25 border border-[#229ED9]/30 dark:border-[#229ED9]/40 text-[#1d8cc4] dark:text-sky-400 font-bold text-sm transition-all duration-200 disabled:opacity-50"
                  >
                    {otpRequesting ? (
                      <span className="w-4 h-4 border-2 border-[#229ED9]/30 border-t-[#229ED9] rounded-full animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="w-4 h-4" />
                    )}
                    Telegram kod orqali kirish
                  </button>
                </div>

                {/* BOT_NOT_STARTED holati */}
                {botNotStarted && (
                  <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Telegram botni ishga tushiring</p>
                    <p className="text-xs text-amber-700 dark:text-amber-200/80 leading-snug">
                      Kod yuborilishi uchun avval botimizga /start buyrugʻini yuborish kerak. Botni ochib, kontaktingizni yuboring — kod darhol keladi.
                    </p>
                    <a
                      href={botNotStarted || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1d8cc4] text-white font-bold text-sm shadow-md transition-all duration-200"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      Open Telegram Bot
                    </a>
                  </div>
                )}
              </>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Hisobingiz yoʻqmi?{' '}
                <Link to="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">
                  Roʻyxatdan oʻtish
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Parolni tiklash</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Tasdiqlash kodi Telegram botingizga yuboriladi
              </p>
            </div>

            {resetError && (<div className="bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 p-3 rounded text-left">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 leading-snug">{resetError}</p>
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Telefon raqamingiz</label>
                  <input
                    type="text"
                    value={resetPhone}
                    onChange={handleResetPhoneChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                    placeholder="+998901234567"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {resetLoading ? 'Yuborilmoqda...' : 'Kodni yuborish'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 p-2.5 rounded-xl text-left">
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-snug">
                    Tasdiqlash kodi Telegram botingizga yuborildi. Iltimos, kodni kiriting.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Tasdiqlash kodi (6 xonali)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-center text-gray-900 tracking-widest text-lg font-bold"
                    placeholder="••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Yangi parol (kamida 6 ta belgi)
                  </label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {resetLoading ? 'Parol yangilanmoqda...' : 'Parolni yangilash'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(1);
                      setResetError('');
                    }}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    Kodni qayta yuborish
                  </button>
                </div>
              </form>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setResetStep(1);
                  setResetError('');
                  setResetCode('');
                  setResetNewPassword('');
                }}
                className="w-full py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Account Modal with Direct Admin Contact */}
      {blockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-100 dark:border-red-900/50 text-center space-y-5">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 text-red-600 shadow-inner">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Profilingiz Bloklangan!</h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Ushbu doʻkon akkaunti administrator tomonidan cheklangan. Hisobni qayta faollashtirish uchun Super Administratorga murojaat qiling:
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {supportInfo.telegram && (
                <a
                  href={
                    supportInfo.telegram.startsWith('http')
                      ? supportInfo.telegram
                      : `https://t.me/${supportInfo.telegram.replace('@', '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-md shadow-sky-500/20 transition-all duration-200"
                >
                  <span>💬 Telegram orqali yozish</span>
                </a>
              )}

              {supportInfo.phone && (
                <a
                  href={`tel:${supportInfo.phone}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200"
                >
                  <span>📞 Qoʻngʻiroq qilish ({supportInfo.phone})</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setBlockedModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Tushunarli, yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
