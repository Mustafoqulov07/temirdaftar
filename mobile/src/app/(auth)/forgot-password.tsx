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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import OtpCodeInput from '@/components/OtpCodeInput';
import { formatPhoneInput } from '@/utils/format';

interface OtpState {
  otpId: string;
  expiresAt?: string;
  status?: string;
  botUrl?: string;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'FORM' | 'CODE' | 'DONE'>('FORM');
  const [phone, setPhone] = useState('+998');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState<OtpState | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

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
    if (newPassword.length < 6) {
      setError('Yangi parol kamida 6 ta belgidan iborat boʻlishi kerak');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<OtpState>('/otp/request', {
        phoneNumber: phone,
        purpose: 'PASSWORD_RESET',
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
      await api.post('/otp/reset-password', {
        otpId: otp.otpId,
        code,
        newPassword,
      });
      setStep('DONE');
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
        purpose: 'PASSWORD_RESET',
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

  if (step === 'DONE') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>✅</Text>
          <Text style={styles.doneTitle}>Parol yangilandi!</Text>
          <Text style={styles.doneText}>
            Parolingiz muvaffaqiyatli oʻzgartirildi. Endi yangi parol bilan
            tizimga kiring.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Kirish sahifasiga</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              <Text style={styles.logoText}>🔒</Text>
            </View>
            <Text style={styles.title}>
              {step === 'FORM' ? 'Parolni tiklash' : 'Kodni kiriting'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'FORM'
                ? 'Telegram orqali tasdiqlash kodini soʻraymiz'
                : `${phone} raqamiga kod yuborildi`}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'FORM' ? (
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yangi parol (kamida 6 ta belgi)</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="••••••"
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
                Kod “Temir Daftar” Telegram botiga yuboriladi. Profil Telegram
                botga ulanmagan boʻlsa, kod yetib bormaydi.
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

              <OtpCodeInput
                key={otp?.otpId || 'otp'}
                purpose="PASSWORD_RESET"
                expiresAt={otp?.expiresAt}
                verifying={verifying}
                error={error}
                submitLabel="Parolni oʻzgartirish"
                onSubmit={handleVerify}
                onResend={handleResend}
                resendCooldownSeconds={resendTimer > 0 ? resendTimer : 45}
                onBack={() => {
                  setStep('FORM');
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
  doneWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  doneEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  doneText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
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
