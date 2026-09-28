import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET';

const PURPOSE_TEXT: Record<OtpPurpose, string> = {
  REGISTER: 'Roʻyxatdan oʻtish uchun Telegramʼga yuborilgan kodni kiriting.',
  LOGIN: 'Tizimga kirish uchun Telegramʼga yuborilgan kodni kiriting.',
  PASSWORD_RESET: 'Parolni oʻzgartirish uchun Telegramʼga yuborilgan kodni kiriting.',
};

const PURPOSE_LABEL: Record<OtpPurpose, string> = {
  REGISTER: 'ROʻYXATDAN OʻTISH UCHUN',
  LOGIN: 'KIRISH UCHUN',
  PASSWORD_RESET: 'PAROLNI OʻZGARTIRISH UCHUN',
};

interface Props {
  purpose: OtpPurpose;
  /** Amal qilish muddati (ISO string) — bo'sh bo'lsa taymer ko'rsatilmaydi */
  expiresAt?: string;
  /** Tasdiqlash jarayoni davom etyapti */
  verifying?: boolean;
  error?: string;
  /** "Tasdiqlash" tugmasi matni */
  submitLabel?: string;
  onSubmit: (code: string) => void;
  onResend?: () => void;
  /** Orqaga qaytish tugmasi (ixtiyoriy) */
  onBack?: () => void;
  resendCooldownSeconds?: number;
}

export const OtpCodeInput: React.FC<Props> = ({
  purpose,
  expiresAt,
  verifying = false,
  error,
  submitLabel = 'Tasdiqlash',
  onSubmit,
  onResend,
  onBack,
  resendCooldownSeconds = 45,
}) => {
  const LENGTH = 6;
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [resendIn, setResendIn] = useState(resendCooldownSeconds);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  // Maqsad o'zgarsa — tozalaymiz
  useEffect(() => {
    setDigits(Array(LENGTH).fill(''));
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 80);
    return () => clearTimeout(t);
  }, [purpose]);

  // Amal qilish muddati taymeri
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

  // Qayta yuborish cooldown
  useEffect(() => {
    setResendIn(resendCooldownSeconds);
    const id = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldownSeconds]);

  const handleChange = (index: number, raw: string) => {
    const val = raw.replace(/\D/g, '');
    if (!val) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    const next = [...digits];
    // Paste qo'llab-quvvatlash: bir necha raqam ketma-ket to'ldiriladi
    let i = index;
    for (const ch of val.split('')) {
      if (i >= LENGTH) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);
    inputsRef.current[Math.min(i, LENGTH - 1)]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputsRef.current[index - 1]?.focus();
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <View>
      {/* Maqsad nishoni */}
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>[{PURPOSE_LABEL[purpose]}]</Text>
        </View>
        {expiresAt && timeLeft !== null && timeLeft > 0 && (
          <Text style={styles.timerText}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </Text>
        )}
        {timeLeft === 0 && <Text style={styles.expiredText}>Kod muddati tugadi</Text>}
      </View>

      <Text style={styles.purposeText}>{PURPOSE_TEXT[purpose]}</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.digitsRow, verifying && { opacity: 0.6 }]}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            style={[
              styles.digitInput,
              error ? styles.digitInputError : d ? styles.digitInputFilled : null,
            ]}
            value={d}
            onChangeText={(t) => handleChange(i, t)}
            onKeyPress={(e) => handleKeyPress(i, e.nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!verifying}
            selectTextOnFocus
          />
        ))}
      </View>

      <View style={styles.linksRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} disabled={verifying}>
            <Text style={styles.backText}>← Orqaga</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {onResend ? (
          <TouchableOpacity onPress={onResend} disabled={resendIn > 0 || verifying}>
            <Text style={[styles.resendText, resendIn > 0 && styles.resendDisabled]}>
              {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : 'Kodni qayta yuborish'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!isComplete || verifying) && styles.submitDisabled]}
        onPress={() => {
          const code = digits.join('');
          // digits MASSIV tekshiriladi — satrda .includes('') doim true qaytaradi!
          if (code.length === LENGTH && digits.every((d) => d !== '')) onSubmit(code);
        }}
        disabled={!isComplete || verifying}
        activeOpacity={0.8}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  purposeText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
  },
  digitInput: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  digitInputFilled: {
    borderColor: '#818CF8',
    backgroundColor: '#EEF2FF',
  },
  digitInputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  resendDisabled: {
    color: '#D1D5DB',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OtpCodeInput;
