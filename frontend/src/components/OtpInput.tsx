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
  /** 6 raqam to'lganda chaqiriladi (onSubmit berilmasa — majburiy) */
  onComplete?: (code: string) => void;
  /**
   * Berilsa — kod avtomatik yuborilmaydi: 6 raqam to'lgach
   * "Kirish"-uslubidagi tugma chiqadi va bosilganda shu funksiya chaqiriladi.
   */
  onSubmit?: (code: string) => void;
  /** Submit tugmasi matni (onSubmit berilganda ko'rinadi) */
  submitLabel?: string;
  /** Qayta yuborish tugmasi bosilganda */
  onResend?: () => void;
  /** Orqaga qaytish tugmasi (ixtiyoriy) */
  onBack?: () => void;
}

const PURPOSE_TEXT: Record<OtpInputProps['purpose'], string> = {
  REGISTER: 'Roʻyxatdan oʻtish uchun Telegram\'ga yuborilgan kodni kiriting.',
  LOGIN: 'Tizimga kirish uchun Telegram\'ga yuborilgan kodni kiriting.',
  PASSWORD_RESET: 'Parolni oʻzgartirish uchun Telegram\'ga yuborilgan kodni kiriting.',
};

const PURPOSE_LABEL: Record<OtpInputProps['purpose'], string> = {
  REGISTER: 'ROʻYXATDAN OʻTISH UCHUN',
  LOGIN: 'KIRISH UCHUN',
  PASSWORD_RESET: 'PAROLNI OʻZGARTIRISH UCHUN',
};

export const OtpInput: React.FC<OtpInputProps> = ({
  purpose,
  expiresAt,
  resendCooldownSeconds = 45,
  verifying = false,
  error,
  onComplete,
  onSubmit,
  submitLabel = 'Tasdiqlash',
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
      // Manual submit rejimida avtomatik yuborilmaydi — foydalanuvchi tugmani bosadi
      if (onSubmit) return;
      const code = arr.join('');
      // E'TIBOR: arr (massiv) tekshiriladi — satrda .includes('') doim true qaytaradi!
      if (code.length === LENGTH && arr.every((d) => d !== '') && !submittedRef.current) {
        submittedRef.current = true;
        onComplete?.(code);
      }
    },
    [onComplete, onSubmit],
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
  // expiresAt yo'q bo'lsa (masalan pending/BOT_NOT_STARTED holatda) countdown ko'rsatilmaydi
  // va inputlar bloklanmaydi — foydalanuvchi keyin kelgan kodni kirita oladi
  const hasError = Boolean(error);

  return (
    <div className="space-y-5">
      {/* Purpose badge — maqsad aniq ko'rinadi */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-[11px] font-black tracking-wider text-indigo-700 dark:text-indigo-300">
          [{PURPOSE_LABEL[purpose]}]
        </span>
        {expiresAt && !expired && (
          <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 tabular-nums">
            {Math.floor((timeLeft || 0) / 60)}:{String((timeLeft || 0) % 60).padStart(2, '0')}
          </span>
        )}
        {expired && <span className="text-xs font-bold text-red-500">Kod muddati tugadi</span>}
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400 leading-snug">{PURPOSE_TEXT[purpose]}</p>

      {hasError && (
        <div className="bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 p-3 rounded-r-lg animate-slide-in" role="alert">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">{error}</p>
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
            disabled={verifying}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={`w-full aspect-square max-w-[52px] text-center text-xl font-black rounded-xl border-2 transition-all duration-150 outline-none
              ${hasError
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900'
                : d
                ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white'
              } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 disabled:opacity-60`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
          >
            ← Orqaga
          </button>
        )}
        {onResend && (
          <button
            type="button"
            onClick={onResend}
            disabled={resendIn > 0 || verifying}
            className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:text-gray-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition"
          >
            {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : 'Kodni qayta yuborish'}
          </button>
        )}
      </div>

      {/* Manual submit rejimi: onSubmit berilsa — 6 raqam to'lgach tugma chiqadi */}
      {onSubmit && (
        <button
          type="button"
          onClick={() => {
            const code = digits.join('');
            // digits massivi tekshiriladi — satrdagi .includes('') doim true bo'ladi
            if (code.length === LENGTH && digits.every((d) => d !== '')) onSubmit(code);
          }}
          disabled={verifying || digits.some((d) => !d)}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-300/60 dark:shadow-indigo-900/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base"
        >
          {verifying ? (
            <>
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Tasdiqlanmoqda...
            </>
          ) : (
            submitLabel
          )}
        </button>
      )}

      {verifying && !onSubmit && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
          <span className="w-4 h-4 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
          Tasdiqlanmoqda...
        </div>
      )}
    </div>
  );
};

export default OtpInput;
