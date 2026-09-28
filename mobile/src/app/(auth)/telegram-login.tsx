import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OtpCodeInput from '@/components/OtpCodeInput';
import { formatPhoneInput } from '@/utils/format';

type Step = 'PHONE' | 'CODE';

interface OtpState {
  otpId: string;
  expiresAt?: string;
  status?: string;
  botUrl?: string;
}

export default function TelegramLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const { loginByOtp } = useAuth();

  const [step, setStep] = useState<Step>(params.phone ? 'PHONE' : 'PHONE');
  const [phone, setPhone] = useState(params.phone ? String(params.phone) : '+998');
  const [otp, setOtp] = useState<OtpState | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setResendTimer(45);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((s) => {
        if (s <= 1 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const handleRequestCode = async () => {
    setError('');
    if (phone.length !== 13) {
      setError('Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<OtpState>('/otp/request', {
        phoneNumber: phone,
        purpose: 'LOGIN',
      });
      setOtp(res);
      setStep('CODE');
      startCooldown();
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Kod yuborishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!otp) return;
    setError('');
    setVerifying(true);
    try {
      // LOGIN maqsadida backend kod to'g'ri bo'lsa tokenlarni qaytaradi
      const res = await api.post<{
        verified: boolean;
        token?: string;
        accessToken?: string;
        refreshToken?: string;
      }>('/otp/verify', { otpId: otp.otpId, code });
      await loginByOtp(res);
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Kod notoʻgʻri');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post<OtpState>('/otp/request', {
        phoneNumber: phone,
        purpose: 'LOGIN',
      });
      setOtp(res);
      startCooldown();
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Qayta yuborishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const openBot = () => {
    const url = otp?.botUrl || 'https://t.me/temirdaftar_uz_bot';
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Orqaga</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>✈️</Text>
            </View>
            <Text style={styles.title}>
              {step === 'PHONE' ? 'Telegram orqali kirish' : 'Kodni kiriting'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'PHONE'
                ? 'Raqamingizga Telegram bot orqali kod yuboriladi'
                : `${phone} raqamiga kod yuborildi`}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'PHONE' ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefon raqam</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(t) => setPhone(formatPhoneInput(t))}
                  keyboardType="phone-pad"
                  placeholder="+998901234567"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Kod yuborish</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>
                💬 Kod “Temir Daftar” Telegram botiga yuboriladi. Agar botni
                ishga tushirmagan boʻlsangiz, avval /start bosing va telefon
                raqamingizni yuboring.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              {otp?.status === 'BOT_NOT_STARTED' && (
                <View style={styles.botNotice}>
                  <Text style={styles.botNoticeText}>
                    ⚠️ Siz hali botga /start qilmagansiz. Botni ochib, telefon
                    raqamingizni yuboring — kod avtomatik yuboriladi.
                  </Text>
                  <TouchableOpacity style={styles.botBtn} onPress={openBot}>
                    <Text style={styles.botBtnText}>Open Telegram Bot</Text>
                  </TouchableOpacity>
                </View>
              )}

              {otp?.status !== 'BOT_NOT_STARTED' && (
                <View style={styles.sentNotice}>
                  <Text style={styles.sentNoticeText}>
                    ✅ Kod Telegramʼga yuborildi. Tasdiqlash uchun kiriting:
                  </Text>
                </View>
              )}

              <OtpCodeInput
                key={otp?.otpId || 'otp'}
                purpose="LOGIN"
                expiresAt={otp?.expiresAt}
                verifying={verifying}
                error={error}
                submitLabel="Kirish"
                onSubmit={handleVerify}
                onResend={handleResend}
                resendCooldownSeconds={resendTimer > 0 ? resendTimer : 45}
                onBack={() => {
                  setStep('PHONE');
                  setOtp(null);
                  setError('');
                }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoText: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    gap: 8,
  },
  inputGroup: {
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  sentNotice: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sentNoticeText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  botNotice: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  botNoticeText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 10,
  },
  botBtn: {
    backgroundColor: '#229ED9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  botBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
