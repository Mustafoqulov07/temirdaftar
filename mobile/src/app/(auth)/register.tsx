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
import { useAuth } from '@/context/AuthContext';
import OtpCodeInput from '@/components/OtpCodeInput';
import { formatPhoneInput } from '@/utils/format';
import api from '@/services/api';

interface OtpState {
  otpId: string;
  expiresAt?: string;
  status?: string;
  botUrl?: string;
}

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');

  // OTP bosqichi
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState<OtpState | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  // Maydon bilan interaktivlik bo'lgandan keyin (yozish/blur) xatolarni ko'rsatamiz
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const router = useRouter();
  const { register } = useAuth();

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

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(formatPhoneInput(text));
  };

  // Jonli (live) validatsiya — xabarlar maydon ostida qizil ko'rinadi
  const fieldErrors = {
    fullName: !fullName.trim()
      ? 'Ismingizni kiriting'
      : fullName.trim().length < 3
        ? 'Ism kamida 3 ta belgidan iborat boʻlishi kerak'
        : '',
    phoneNumber: phoneNumber.length !== 13
      ? 'Telefon raqam notoʻgʻri shaklda (+998XXXXXXXXX)'
      : '',
    password: !password
      ? 'Parolni kiriting'
      : password.length < 6
        ? 'Parol kamida 6 ta belgidan iborat boʻlishi kerak'
        : '',
    storeName: !storeName.trim()
      ? 'Doʻkon nomini kiriting'
      : storeName.trim().length < 2
        ? 'Doʻkon nomi kamida 2 ta belgidan iborat boʻlishi kerak'
        : '',
  };
  const isFieldInvalid = (field: keyof typeof fieldErrors) => !!touched[field] && !!fieldErrors[field];

  const requestOtp = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<OtpState>('/otp/request', {
        phoneNumber,
        purpose: 'REGISTER',
      });
      setOtp(res);
      setOtpStep(true);
      startCooldown();
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Kod yuborishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, startCooldown]);

  const handleSubmitForm = async () => {
    setError('');

    // Barcha maydonlarni "tekshirilgan" deb belgilaymiz — xatolar maydon ostida ko'rinadi
    setTouched({ fullName: true, phoneNumber: true, password: true, storeName: true });
    if (Object.values(fieldErrors).some(Boolean)) {
      return;
    }

    // Web'dagi kabi: avval OTP so'raymiz, kod tasdiqlangach ro'yxatdan o'tamiz
    await requestOtp();
  };

  const handleVerify = async (code: string) => {
    if (!otp) return;
    setError('');
    setVerifying(true);
    try {
      await api.post('/otp/verify', { otpId: otp.otpId, code });
      // Kod tasdiqlandi — endi ro'yxatdan o'tamiz (backend OTP'ni tekshirgan,
      // REGISTER ham hozircha to'g'ridan-to'g'ri qabul qiladi)
      await register({
        fullName: fullName.trim(),
        phoneNumber,
        password,
        storeName: storeName.trim(),
      });
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Kod notoʻgʻri yoki roʻyxatdan oʻtishda xatolik');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    await requestOtp();
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
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>T</Text>
            </View>
            <Text style={styles.title}>
              {otpStep ? 'Tasdiqlash kodi' : 'Roʻyxatdan oʻtish'}
            </Text>
            <Text style={styles.subtitle}>
              {otpStep
                ? `${phoneNumber} uchun Telegramʼga kod yuborildi`
                : 'Yangi doʻkon hisobi yarating'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!otpStep ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Toʻliq ism</Text>
                <TextInput
                  style={[styles.input, isFieldInvalid('fullName') && styles.inputInvalid]}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    markTouched('fullName');
                  }}
                  onBlur={() => markTouched('fullName')}
                  placeholder="Ism Familiya"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
                {isFieldInvalid('fullName') && (
                  <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefon raqam</Text>
                <TextInput
                  style={[styles.input, isFieldInvalid('phoneNumber') && styles.inputInvalid]}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    handlePhoneChange(text);
                    markTouched('phoneNumber');
                  }}
                  onBlur={() => markTouched('phoneNumber')}
                  keyboardType="phone-pad"
                  placeholder="+998901234567"
                  placeholderTextColor="#9CA3AF"
                />
                {isFieldInvalid('phoneNumber') && (
                  <Text style={styles.fieldError}>{fieldErrors.phoneNumber}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Parol (kamida 6 ta belgi)</Text>
                <TextInput
                  style={[styles.input, isFieldInvalid('password') && styles.inputInvalid]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    markTouched('password');
                  }}
                  onBlur={() => markTouched('password')}
                  secureTextEntry
                  placeholder="••••••"
                  placeholderTextColor="#9CA3AF"
                />
                {isFieldInvalid('password') && (
                  <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Doʻkon nomi</Text>
                <TextInput
                  style={[styles.input, isFieldInvalid('storeName') && styles.inputInvalid]}
                  value={storeName}
                  onChangeText={(text) => {
                    setStoreName(text);
                    markTouched('storeName');
                  }}
                  onBlur={() => markTouched('storeName')}
                  placeholder="Masalan: Oltin Bozor"
                  placeholderTextColor="#9CA3AF"
                />
                {isFieldInvalid('storeName') && (
                  <Text style={styles.fieldError}>{fieldErrors.storeName}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmitForm}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Davom etish</Text>
                )}
              </TouchableOpacity>
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
                purpose="REGISTER"
                expiresAt={otp?.expiresAt}
                verifying={verifying}
                error={error}
                submitLabel="Roʻyxatdan oʻtish"
                onSubmit={handleVerify}
                onResend={handleResend}
                resendCooldownSeconds={resendTimer > 0 ? resendTimer : 45}
                onBack={() => {
                  setOtpStep(false);
                  setOtp(null);
                  setError('');
                }}
              />
            </View>
          )}

          {!otpStep && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Hisobingiz bormi? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Kirish</Text>
              </TouchableOpacity>
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
    paddingVertical: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
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
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
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
  inputInvalid: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  botNotice: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
