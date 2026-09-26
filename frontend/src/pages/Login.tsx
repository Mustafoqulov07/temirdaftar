import React, { useState, useMemo } from 'react';
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
  UserGroupIcon,
} from '@heroicons/react/24/outline';

/* ---------- Suzuvchi sharchalar + yulduzlar (kreativ fon) ---------- */
const AmbientBackground: React.FC = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        top: `${(i * 37 + 13) % 100}%`,
        left: `${(i * 53 + 7) % 100}%`,
        size: 1.5 + ((i * 7) % 3),
        delay: `${(i % 9) * 0.6}s`,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Orbalgan sharchalar */}
      <div className="animate-orb-1 absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-indigo-400/30 dark:bg-indigo-600/25 blur-3xl" />
      <div className="animate-orb-2 absolute top-1/3 -right-28 w-[24rem] h-[24rem] rounded-full bg-violet-400/25 dark:bg-purple-600/20 blur-3xl" />
      <div className="animate-orb-3 absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 dark:bg-cyan-500/15 blur-3xl" />

      {/* Dark fazada yulduzlar */}
      {stars.map((s) => (
        <span
          key={s.id}
          className="animate-twinkle hidden dark:block absolute rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}

      {/* Nozik grid chiziqlar */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.07) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
    </div>
  );
};

/* ---------- Brend paneli (chap tomon, desktop) ---------- */
const BrandPanel: React.FC<{ subtitle: string }> = ({ subtitle }) => (
  <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[52%] p-12 text-white relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 dark:from-[#0b1020] dark:via-[#131a33] dark:to-[#0a0e1d] animate-auth-rise">
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
        <span className="text-indigo-200 dark:text-indigo-300">bir joyda boshqaring</span>
      </h2>
      <p className="text-indigo-100/90 dark:text-slate-400 text-base leading-relaxed max-w-md">{subtitle}</p>

      <ul className="space-y-4">
        {[
          { icon: ChartBarIcon, title: 'Real vaqtli statistika', desc: 'Qarzdorlik, toʻlovlar va muddati oʻtganlar bir ekranda' },
          { icon: ShieldCheckIcon, title: 'Xavfsiz va ishonchli', desc: 'Maʼlumotlaringiz shifrlangan holda saqlanadi' },
          { icon: BellAlertIcon, title: 'Telegram eslatmalar', desc: 'Toʻlov muddati yaqinlashganda bot xabar beradi' },
        ].map((f) => (
          <li key={f.title} className="flex items-start gap-4">
            <div className="p-2.5 bg-white/10 dark:bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <f.icon className="w-5 h-5 text-indigo-100 dark:text-indigo-300" />
            </div>
            <div>
              <p className="font-bold text-sm">{f.title}</p>
              <p className="text-xs text-indigo-200/80 dark:text-slate-500 mt-0.5">{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>

    <p className="relative text-xs text-indigo-200/60 dark:text-slate-600">© {new Date().getFullYear()} Temir Daftar — Magazinlar uchun raqamli qarz daftari</p>
  </div>
);

/** Backend javobida botUrl bo'lmasa — env'dagi username bilan havola (bo'lmasa bo'sh) */
const buildBotUrlFallback = () => {
  const username = (import.meta.env.VITE_BOT_USERNAME || '').replace(/^@/, '');
  return username ? `https://t.me/${username}?start=auth` : '';
};

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

  // Telegram OTP oqimi holatlari (alohida modal oynada)
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [tgStep, setTgStep] = useState<'PHONE' | 'CODE'>('PHONE');
  const [tgPhone, setTgPhone] = useState('+998');
  const [otpId, setOtpId] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [botNotStarted, setBotNotStarted] = useState<string | null>(null);
  const [otpRequesting, setOtpRequesting] = useState(false);

  // Parolni tiklash (PASSWORD_RESET OTP) holatlari
  // Bosqichlar: 1: telefon + yangi parol → 2: Telegram kodini kiriting (bitta so'rovda yakunlanadi)
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetPhone, setResetPhone] = useState('+998');
  const [resetOtpId, setResetOtpId] = useState('');
  const [resetOtpExpiresAt, setResetOtpExpiresAt] = useState('');
  const [resetOtpRequesting, setResetOtpRequesting] = useState(false);
  const [resetOtpVerifying, setResetOtpVerifying] = useState(false);
  const [resetOtpError, setResetOtpError] = useState('');
  const [resetBotNotStarted, setResetBotNotStarted] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetError, setResetError] = useState('');

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

  /** Telegram modalini ochish — 1-bosqich: raqam kiritish */
  const openTelegramModal = () => {
    setError('');
    setOtpError('');
    setBotNotStarted(null);
    setTgPhone(phoneNumber.length === 13 ? phoneNumber : '+998');
    setTgStep('PHONE');
    setTgModalOpen(true);
  };

  /** 2-bosqich: raqamga LOGIN kodi yuborish — BOT_NOT_STARTED holatini ham qayta ishlaydi */
  const requestTelegramOtp = async () => {
    setError('');
    setOtpError('');
    setBotNotStarted(null);
    if (tgPhone.length !== 13) {
      setOtpError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      return;
    }
    setOtpRequesting(true);
    try {
      const res = await api.post('/otp/request', {
        phoneNumber: tgPhone,
        purpose: 'LOGIN',
      });
      setOtpId(res.data.otpId);
      setOtpExpiresAt(res.data.expiresAt);
      if (res.data?.status === 'BOT_NOT_STARTED') {
        setBotNotStarted(res.data.botUrl || buildBotUrlFallback());
      } else {
        showToast('🔑 Kod Telegram botga yuborildi — KIRISH UCHUN', 'success');
      }
      setTgStep('CODE');
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response ? err.message : 'Internet ulanishini tekshiring.');
      if (err.response?.status === 429) setOtpError(msg || 'Juda koʻp urinish. Keyinroq qayta urinib koʻring.');
      else setOtpError(msg || 'Kod yuborishda xatolik yuz berdi');
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
        setTgModalOpen(false);
        applyAuthResult(res.data);
      } else {
        setOtpError('Kod tasdiqlandi, lekin kirish amalga oshmadi. Qayta urinib koʻring.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response ? err.message : 'Internet ulanishini tekshiring.');
      setOtpError(msg || 'Kod notoʻgʻri.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // ---------- Parolni tiklash: PASSWORD_RESET OTP oqimi ----------
  const handleResetPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digits = val.replace(/\D/g, '');
    const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
    const valid9 = localDigits.slice(0, 9);
    setResetPhone('+998' + valid9);
  };

  const requestResetOtp = async () => {
    setResetError('');
    setResetOtpError('');
    setResetBotNotStarted(null);
    if (resetPhone.length !== 13) {
      setResetError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      return;
    }
    setResetOtpRequesting(true);
    try {
      const res = await api.post('/otp/request', { phoneNumber: resetPhone, purpose: 'PASSWORD_RESET' });
      setResetOtpId(res.data.otpId);
      setResetOtpExpiresAt(res.data.expiresAt);
      if (res.data?.status === 'BOT_NOT_STARTED') {
        setResetBotNotStarted(res.data.botUrl || buildBotUrlFallback());
      } else {
        showToast('🔒 Kod Telegram botga yuborildi — PAROLNI O‘ZGARTIRISH uchun', 'success');
      }
      setResetStep(2);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Kodni yuborishda xatolik yuz berdi');
    } finally {
      setResetOtpRequesting(false);
    }
  };

  /** Kod kiritilganda — kod + yangi parol bitta so'rovda tasdiqlanadi */
  const handleResetOtpComplete = async (code: string) => {
    setResetOtpError('');
    if (resetNewPassword.length < 6) {
      setResetError('Avval yangi parolni kiriting (kamida 6 ta belgi)');
      setResetStep(1);
      return;
    }
    setResetOtpVerifying(true);
    try {
      const res = await api.post('/otp/reset-password', {
        otpId: resetOtpId,
        code,
        newPassword: resetNewPassword,
      });
      if (res.data?.success) {
        showToast('✅ Parol muvaffaqiyatli yangilandi!', 'success');
        setForgotModalOpen(false);
        setResetStep(1);
        setResetPhone('+998');
        setResetOtpId('');
        setResetNewPassword('');
      }
    } catch (err: any) {
      setResetOtpError(err.response?.data?.message || 'Kod notoʻgʻri yoki muddati tugagan.');
    } finally {
      setResetOtpVerifying(false);
    }
  };

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

      setApiToken(token);

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

  return (
    <div className="auth-theme-transition min-h-screen bg-slate-100 dark:bg-[#070b16] flex relative">
      <AmbientBackground />
      <BrandPanel subtitle="Doʻkoningizdagi barcha qarz va toʻlovlarni Temir Daftar bilan tartibli, aniq va xavfsiz yuriting. Har bir mijoz tarixi bir joyda." />

      {/* O'ng tomon — forma */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobil logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 animate-auth-rise">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-500/30">
              T
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Temir Daftar</span>
          </div>

          <div className="animate-auth-rise relative bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/50 dark:shadow-black/60 border border-white/60 dark:border-slate-800 p-8 sm:p-10 overflow-hidden">
            {/* Yugurib o'tadigan yorug'lik chizig'i */}
            <div className="pointer-events-none absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-transparent via-indigo-400/10 dark:via-indigo-400/15 to-transparent animate-card-shine" />

            <div className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200 transition-colors z-10">
              <ThemeToggle />
            </div>
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

            {(
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
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-300/60 dark:shadow-indigo-900/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base"
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

                {/* Telegram OTP varianti — alohida modal oyna ochadi */}
                <div className="mt-6">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-slate-800" />
                    <span className="relative bg-transparent dark:bg-slate-900 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 backdrop-blur-sm">
                      yoki
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openTelegramModal}
                    disabled={otpRequesting}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#229ED9]/10 dark:bg-[#229ED9]/15 hover:bg-[#229ED9]/20 dark:hover:bg-[#229ED9]/25 border border-[#229ED9]/30 dark:border-[#229ED9]/40 text-[#1d8cc4] dark:text-sky-400 font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Telegram kod orqali kirish
                  </button>
                </div>
              </>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
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

      {/* Telegram Login Modal — raqam → kod → Kirish tugmasi */}
      {tgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4 animate-slide-in">
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-[#229ED9]/10 dark:bg-[#229ED9]/15 text-[#1d8cc4] dark:text-sky-400">
                <PaperAirplaneIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Telegram orqali kirish</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {tgStep === 'PHONE'
                  ? 'Raqamingizni kiriting — kod Telegram botga KIRISH UCHUN deb yuboriladi'
                  : 'Botga yuborilgan kodni kiriting va "Kirish"ni bosing'}
              </p>
            </div>

            {otpError && (
              <div className="bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 p-3 rounded-r-lg text-left">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 leading-snug">{otpError}</p>
              </div>
            )}

            {tgStep === 'PHONE' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  requestTelegramOtp();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Telefon raqam</label>
                  <input
                    type="text"
                    value={tgPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      const local = digits.startsWith('998') ? digits.slice(3) : digits;
                      setTgPhone('+998' + local.slice(0, 9));
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                    placeholder="+998901234567"
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpRequesting}
                  className="w-full flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1d8cc4] text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md shadow-sky-500/30 transition-all duration-200 disabled:opacity-50"
                >
                  {otpRequesting ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                  )}
                  {otpRequesting ? 'Yuborilmoqda...' : 'Kodni yuborish'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {botNotStarted && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Botni ishga tushiring</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-200/80 leading-snug">
                      /start bering va kontakt yuboring — kod avtomatik keladi.
                    </p>
                    <a
                      href={botNotStarted || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#229ED9] hover:bg-[#1d8cc4] text-white font-bold text-xs transition"
                    >
                      <PaperAirplaneIcon className="w-3.5 h-3.5" />
                      Open Telegram Bot
                    </a>
                  </div>
                )}
                <OtpInput
                  purpose="LOGIN"
                  expiresAt={otpExpiresAt}
                  verifying={otpVerifying}
                  error={otpError}
                  onSubmit={handleOtpComplete}
                  submitLabel="Kirish"
                  onResend={requestTelegramOtp}
                  onBack={() => {
                    setTgStep('PHONE');
                    setOtpError('');
                    setBotNotStarted(null);
                  }}
                />
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setTgModalOpen(false);
                  setTgStep('PHONE');
                  setOtpError('');
                  setOtpId('');
                  setBotNotStarted(null);
                }}
                className="w-full py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal — PASSWORD_RESET OTP oqimi */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4 animate-slide-in">
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <UserGroupIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Parolni tiklash</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Tasdiqlash kodi Telegram botga <span className="font-bold">PAROLNI OʻZGARTIRISH UCHUN</span> deb yuboriladi
              </p>
            </div>

            {resetError && (
              <div className="bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 p-3 rounded-r-lg text-left">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 leading-snug">{resetError}</p>
              </div>
            )}

            {resetStep === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  requestResetOtp();
                }}
                className="space-y-4"
              >
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Yangi parol (kamida 6 ta belgi)</label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetOtpRequesting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {resetOtpRequesting ? 'Yuborilmoqda...' : 'Kodni yuborish'}
                </button>
              </form>
            )}

            {resetStep === 2 && (
              <div className="space-y-4">
                {resetBotNotStarted && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Botni ishga tushiring</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-200/80 leading-snug">
                      /start bering va kontakt yuboring — kod avtomatik keladi.
                    </p>
                    <a
                      href={resetBotNotStarted || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#229ED9] hover:bg-[#1d8cc4] text-white font-bold text-xs transition"
                    >
                      <PaperAirplaneIcon className="w-3.5 h-3.5" />
                      Open Telegram Bot
                    </a>
                  </div>
                )}
                <OtpInput
                  purpose="PASSWORD_RESET"
                  expiresAt={resetOtpExpiresAt}
                  verifying={resetOtpVerifying}
                  error={resetOtpError}
                  onComplete={handleResetOtpComplete}
                  onResend={requestResetOtp}
                  onBack={() => {
                    setResetStep(1);
                    setResetOtpError('');
                    setResetBotNotStarted(null);
                  }}
                />
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setResetStep(1);
                  setResetError('');
                  setResetOtpError('');
                  setResetOtpId('');
                  setResetNewPassword('');
                  setResetBotNotStarted(null);
                }}
                className="w-full py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Account Modal */}
      {blockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-slide-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-100 dark:border-red-900/50 text-center space-y-5">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 shadow-inner">
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
