import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { setApiToken } from '../services/api';
import OtpInput from '../components/OtpInput';
import ThemeToggle from '../components/ThemeToggle';
import { UserPlusIcon, CheckCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

/* ---------- Suzuvchi sharchalar + yulduzlar (Login bilan bir xil fon) ---------- */
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
      <div className="animate-orb-1 absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-indigo-400/30 dark:bg-indigo-600/25 blur-3xl" />
      <div className="animate-orb-2 absolute top-1/3 -right-28 w-[24rem] h-[24rem] rounded-full bg-violet-400/25 dark:bg-purple-600/20 blur-3xl" />
      <div className="animate-orb-3 absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 dark:bg-cyan-500/15 blur-3xl" />

      {stars.map((s) => (
        <span
          key={s.id}
          className="animate-twinkle hidden dark:block absolute rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}

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

/* ---------- Brend paneli ---------- */
const BrandPanel: React.FC = () => (
  <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[52%] p-12 text-white relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 dark:from-[#0b1020] dark:via-[#131a33] dark:to-[#0a0e1d] animate-auth-rise">
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
        <span className="text-indigo-200 dark:text-indigo-300">raqamli qarz daftari</span>
      </h2>
      <p className="text-indigo-100/90 dark:text-slate-400 text-base leading-relaxed max-w-md">
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
            <span className="text-sm text-indigo-50 dark:text-slate-300">{t}</span>
          </li>
        ))}
      </ul>
    </div>

    <p className="relative text-xs text-indigo-200/60 dark:text-slate-600">© {new Date().getFullYear()} Temir Daftar — Magazinlar uchun raqamli qarz daftari</p>
  </div>
);

/** Backend javobida botUrl bo'lmasa — standart bot havolasi */
const buildBotUrlFallback = () => `https://t.me/${(import.meta.env.VITE_BOT_USERNAME || 'qarzni_uzbot').replace(/^@/, '')}?start=auth`;

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // REGISTER OTP bosqichi
  const [otpMode, setOtpMode] = useState(false);
  const [otpId, setOtpId] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [botNotStarted, setBotNotStarted] = useState<string | null>(null);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    fullName: string;
    phoneNumber: string;
    password?: string;
    storeName: string;
    telegramId?: string;
  } | null>(null);

  const { login, telegramRegData } = useAuth();
  const { showToast } = useToast();
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

  /** REGISTER OTP so'raymiz (forma ma'lumotlarini saqlab qo'yamiz) */
  const requestRegisterOtp = async (payload: typeof pendingPayload) => {
    setError('');
    setOtpError('');
    setBotNotStarted(null);
    setOtpRequesting(true);
    try {
      const res = await api.post('/otp/request', {
        phoneNumber: payload!.phoneNumber,
        purpose: 'REGISTER',
      });
      setPendingPayload(payload);
      setOtpId(res.data.otpId);
      setOtpExpiresAt(res.data.expiresAt);
      if (res.data?.status === 'BOT_NOT_STARTED') {
        setBotNotStarted(res.data.botUrl || buildBotUrlFallback());
      } else {
        showToast('📝 Kod Telegram botga yuborildi — REGISTER uchun', 'success');
      }
      setOtpMode(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kod yuborishda xatolik yuz berdi');
    } finally {
      setOtpRequesting(false);
    }
  };

  /** Kod tasdiqlanganda — hisob yaratamiz */
  const handleOtpComplete = async (code: string) => {
    setOtpError('');
    setOtpVerifying(true);
    try {
      const res = await api.post('/otp/verify', { otpId, code });
      if (res.data?.verified) {
        showToast('✅ Telefon raqam tasdiqlandi!', 'success');
        await completeRegistration();
      } else {
        setOtpError('Kod tasdiqlanmadi. Qayta urinib koʻring.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Kod notoʻgʻri.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const completeRegistration = async () => {
    if (!pendingPayload) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/register', {
        ...pendingPayload,
        password: pendingPayload.password || undefined,
        telegramId: pendingPayload.telegramId || undefined,
      });

      const { token, user: regUser, store: regStore } = response.data;

      setApiToken(token);

      let user = regUser;
      let store = regStore;
      if (!user) {
        const profileRes = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        user = profileRes.data.user;
        store = profileRes.data.store;
      }

      login(token, user, store);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Roʻyxatdan oʻtishda xatolik yuz berdi. Iltimos, qayta urining.'
      );
      setOtpMode(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneNumber.length !== 13) {
      setError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      return;
    }

    if (!telegramRegData && password.length < 6) {
      setError('Parol uzunligi kamida 6 ta belgidan iborat boʻlishi kerak');
      return;
    }

    if (!telegramRegData && password !== confirmPassword) {
      setError('Parollar mos kelmadi. Iltimos, qayta kiriting.');
      return;
    }

    await requestRegisterOtp({
      fullName,
      phoneNumber,
      password: password || undefined,
      storeName,
      telegramId: telegramRegData?.telegramId || undefined,
    });
  };

  return (
    <div className="auth-theme-transition min-h-screen bg-slate-100 dark:bg-[#070b16] flex relative">
      <AmbientBackground />
      <BrandPanel />

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

            {otpMode ? (
              <>
                <div className="space-y-2 mb-6">
                  <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Telefonni tasdiqlang</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Oxirgi qadam — Telegram'ga yuborilgan kodni kiriting
                  </p>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#229ED9]/10 dark:bg-[#229ED9]/15 border border-[#229ED9]/25 mb-5">
                  <PaperAirplaneIcon className="w-5 h-5 text-[#1d8cc4] dark:text-sky-400 shrink-0" />
                  <p className="text-xs font-semibold text-[#1d8cc4] dark:text-sky-300 leading-snug">
                    📝 Kod Telegram botga yuborildi — <span className="font-black">ROʻYXATDAN OʻTISH UCHUN</span>
                  </p>
                </div>

                {botNotStarted && (
                  <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Telegram botni ishga tushiring</p>
                    <p className="text-xs text-amber-700 dark:text-amber-200/80 leading-snug">
                      /start buyrugʻini yuboring va telefon raqamingizni ulang — kod <span className="font-bold">avtomatik</span> keladi.
                    </p>
                    <a
                      href={botNotStarted || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1d8cc4] text-white font-bold text-sm shadow-md shadow-sky-500/30 transition-all duration-200"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      Open Telegram Bot
                    </a>
                  </div>
                )}

                <OtpInput
                  purpose="REGISTER"
                  expiresAt={otpExpiresAt}
                  verifying={otpVerifying || loading}
                  error={otpError}
                  onComplete={handleOtpComplete}
                  onResend={() => requestRegisterOtp(pendingPayload)}
                  onBack={() => {
                    setOtpMode(false);
                    setOtpError('');
                    setBotNotStarted(null);
                  }}
                />
              </>
            ) : (
              <>
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
                  <div className="bg-indigo-50 dark:bg-indigo-950/50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
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
                      placeholder={telegramRegData ? 'Ixtiyoriy (veb-saytga kirish uchun)' : 'Kamida 6 belgidan iborat parol'}
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
                    disabled={otpRequesting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-300/60 dark:shadow-indigo-900/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base"
                  >
                    {otpRequesting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Kod yuborilmoqda...
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="w-5 h-5" />
                        Davom etish
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-gray-400 dark:text-slate-500">
                    Davom etish bilan Telegram botga <span className="font-bold">ROʻYXATDAN OʻTISH UCHUN</span> kod yuboriladi
                  </p>
                </form>
              </>
            )}

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
