import React, { useEffect, useRef, useState, useCallback } from 'react';

interface OtpInputProps {
  /** OTP maqsadi — UI'da aniq ko'rsatiladi */
  purpose: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET';
  /** Amal qilish muddati (ISO string) */
  expiresAt?: string;
  /** Qayta yuborish cooldown (soniya) */
  resendCooldownSeconds?: number;
  /** Tasdiqlash jarayoni davom etyapti */
  verifying?: boolean;
  /** Xato matni (clear error state) */
  error?: string;
  /** 6 raqam to'lganda chaqiriladi */
  onComplete: (code: string) => void;
  /** Qayta yuborish tugmasi bosilganda */
  onResend?: () => void;
  /** Orqaga qaytish tugmasi (ixtiyoriy) */
  onBack?: () => void;
}

const PURPOSE_TEXT: Record<OtpInputProps['purpose'], string> = {
  REGISTER: 'Roʻyxatdan oʻtish uchun Telegram\'ga yuborilgan kodni kiriting.',
  LOGIN: 'Tizimga kirish uchun Telegram\'ga yuborilgan kodni kiriting.',
  PASSWORD_RESET: 'Parolni tiklash uchun Telegram\'ga yuborilgan kodni kiriting.',
};

const PURPOSE_LABEL: Record<OtpInputProps['purpose'], string> = {
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN',
  PASSWORD_RESET: 'PASSWORD_RESET',
};

export const OtpInput: React.FC<OtpInputProps> = ({
  purpose,
  expiresAt,
  resendCooldownSeconds = 45,
  verifying = false,
  error,
  onComplete,
  onResend,
  onBack,
}) => {
  const LENGTH = 6;
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [resendIn, setResendIn] = useState(resendCooldownSeconds);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const submittedRef = useRef(false);

  // Reset when purpose changes
  useEffect(() => {
    setDigits(Array(LENGTH).fill(''));
    submittedRef.current = false;
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 80);
    return () => clearTimeout(t);
  }, [purpose]);

  // Expiry countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Resend cooldown
  useEffect(() => {
    setResendIn(resendCooldownSeconds);
    const id = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldownSeconds]);

  const emitIfComplete = useCallback(
    (arr: string[]) => {
      const code = arr.join('');
      if (code.length === LENGTH && !code.includes('') && !submittedRef.current) {
        submittedRef.current = true;
        onComplete(code);
      }
    },
    [onComplete],
  );

  const handleChange = (index: number, raw: string) => {
    const val = raw.replace(/\D/g, '');
    if (!val) {
      // Cleared
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    const next = [...digits];
    // Support pasting into a middle box
    const chars = val.split('');
    let i = index;
    for (const ch of chars) {
      if (i >= LENGTH) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);
    const focusIdx = Math.min(i, LENGTH - 1);
    inputsRef.current[focusIdx]?.focus();
    emitIfComplete(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        next[index - 1] = '';
        setDigits(next);
        inputsRef.current[index - 1]?.focus();
      }
      submittedRef.current = false;
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!text) return;
    const next = Array(LENGTH).fill('');
    text.split('').forEach((ch, i) => (next[i] = ch));
    setDigits(next);
    inputsRef.current[Math.min(text.length, LENGTH - 1)]?.focus();
    emitIfComplete(next);
  };

  const expired = timeLeft === 0;
  const hasError = Boolean(error);

  return (
    <div className="space-y-5">
      {/* Purpose badge — maqsad aniq ko'rinadi */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-black tracking-wider text-indigo-700">
          [{PURPOSE_LABEL[purpose]}]
        </span>
        {expiresAt && !expired && (
          <span className="text-xs font-semibold text-gray-400 tabular-nums">
            {Math.floor((timeLeft || 0) / 60)}:{String((timeLeft || 0) % 60).padStart(2, '0')}
          </span>
        )}
        {expired && <span className="text-xs font-bold text-red-500">Kod muddati tugadi</span>}
      </div>

      <p className="text-sm text-gray-500 leading-snug">{PURPOSE_TEXT[purpose]}</p>

      {hasError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg animate-slide-in" role="alert">
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div
        className={`flex justify-between gap-2 sm:gap-3 ${verifying ? 'opacity-60 pointer-events-none' : ''}`}
        onPaste={handlePaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`${i + 1}-xonali raqam`}
            value={d}
            disabled={verifying || expired}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={`w-full aspect-square max-w-[52px] text-center text-xl font-black rounded-xl border-2 transition-all duration-150 outline-none
              ${hasError
                ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : d
                ? 'border-indigo-400 bg-indigo-50/50 text-gray-900'
                : 'border-gray-200 bg-gray-50 text-gray-900'
              } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
          >
            ← Orqaga
          </button>
        )}
        {onResend && (
          <button
            type="button"
            onClick={onResend}
            disabled={resendIn > 0 || verifying}
            className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-gray-300 disabled:cursor-not-allowed transition"
          >
            {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : 'Kodni qayta yuborish'}
          </button>
        )}
      </div>

      {verifying && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
          <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          Tasdiqlanmoqda...
        </div>
      )}
    </div>
  );
};

export default OtpInput;
