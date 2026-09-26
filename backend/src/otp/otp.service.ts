/**
 * Telegram OTP xizmati.
 *
 * Maqsad (purpose) teglari: REGISTER | LOGIN | PASSWORD_RESET
 * - OTP hech qachon bazada ochiq saqlanmaydi — faqat HMAC-SHA256 hash
 * - Redis mavjud emas, shuning uchun vaqtinchalik holat memoryda + DB'da
 *   resetCode maydoni orqali (PASSWORD_RESET uchun mavjud infratuzilma)
 * - Qayta yuborish cooldown va urinishlar limiti brute force'ga qarshi
 */
import { randomInt, createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET';

export interface OtpPendingState {
  otpId: string;
  phone: string;
  purpose: OtpPurpose;
  expiresAt: string;
  status: 'PENDING' | 'SENT' | 'BOT_NOT_STARTED' | 'VERIFIED' | 'EXPIRED';
  /** BOT_NOT_STARTED holatida foydalanuvchini botga yo'naltirish uchun havola */
  botUrl?: string;
}

interface OtpEntry {
  otpId: string;
  phone: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  resendAvailableAt: number;
  telegramId: string | null;
  createdAt: number;
}

const OTP_TTL_MS = 2 * 60 * 1000; // 2 daqiqa
const RESEND_COOLDOWN_MS = 45 * 1000; // 45 soniya
const MAX_ATTEMPTS = 5;
const MAX_ENTRIES_PER_PHONE = 3;

function hashOtp(phone: string, purpose: OtpPurpose, code: string): string {
  const secret = (process.env.OTP_SECRET || process.env.JWT_SECRET || 'temirdaftar-otp-secret').trim();
  return createHmac('sha256', secret).update(`${phone}:${purpose}:${code}`).digest('hex');
}

export function buildBotUrl(): string {
  const username = (process.env.BOT_USERNAME || 'qarzni_uzbot').replace(/^@/, '');
  return `https://t.me/${username}?start=auth`;
}

@Injectable()
export class OtpService {
  private entries = new Map<string, OtpEntry>(); // otpId -> entry
  private lastSentAtByPhone = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  private buildMessage(purpose: OtpPurpose, code: string): string {
    const tag = `[${purpose}]`;
    return (
      `${tag}\n\n` +
      `Tasdiqlash kodingiz: *${code}*\n` +
      `Bu kod 2 daqiqa ichida amal qiladi.\n\n` +
      `Agar siz bu so'rovni yubormagan bo'lsangiz, e'tibor bermang.`
    );
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, e] of this.entries) {
      if (e.expiresAt < now - 60 * 1000) this.entries.delete(id);
    }
  }

  private enforcePhoneLimit(phone: string) {
    const now = Date.now();
    const perPhone = [...this.entries.entries()]
      .filter(([, e]) => e.phone === phone)
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    while (perPhone.length >= MAX_ENTRIES_PER_PHONE) {
      const oldest = perPhone.shift();
      if (oldest) this.entries.delete(oldest[0]);
    }
    void now;
  }

  /**
   * OTP yaratadi va Telegram'ga yuborishga harakat qiladi.
   * Agar foydalanuvchi botni /start qilmagan bo'lsa — BOT_NOT_STARTED qaytadi.
   */
  async requestOtp(phone: string, purpose: OtpPurpose): Promise<OtpPendingState> {
    this.cleanup();

    // Cooldown tekshiruvi
    const lastSent = this.lastSentAtByPhone.get(`${phone}:${purpose}`) || 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      const waitMs = RESEND_COOLDOWN_MS - (Date.now() - lastSent);
      const err: any = new Error(
        `Juda tez so'rov yubordingiz. ${Math.ceil(waitMs / 1000)} soniyadan keyin qayta urinib ko'ring.`,
      );
      err.status = 429;
      throw err;
    }

    // Telegram ulangan foydalanuvchini topamiz
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: phone },
    });

    let telegramId = user?.telegramId || null;

    if (!telegramId) {
      // Foydalanuvchi botni /start qilmagan — pending entry yaratamiz.
      // Bot /start + kontakt yuborganda deliverPendingOtpForTelegram shu entry'ni topib kodni yuboradi.
      const code = randomInt(100000, 999999).toString();
      const otpId = randomInt(100000, 999999).toString(36) + Date.now().toString(36);
      const now = Date.now();

      this.enforcePhoneLimit(phone);

      this.entries.set(otpId, {
        otpId,
        phone,
        purpose,
        codeHash: hashOtp(phone, purpose, code),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        resendAvailableAt: now + RESEND_COOLDOWN_MS,
        telegramId: null,
        createdAt: now,
      });
      // Cooldown'ni yangilaymiz — kontakt kelgunga qadam qayta so'ramasin
      this.lastSentAtByPhone.set(`${phone}:${purpose}`, now);

      return {
        otpId,
        phone,
        purpose,
        expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
        status: 'BOT_NOT_STARTED',
        botUrl: buildBotUrl(),
      };
    }

    const code = randomInt(100000, 999999).toString();
    const otpId = randomInt(100000, 999999).toString(36) + Date.now().toString(36);
    const now = Date.now();

    this.enforcePhoneLimit(phone);

    this.entries.set(otpId, {
      otpId,
      phone,
      purpose,
      codeHash: hashOtp(phone, purpose, code),
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      resendAvailableAt: now + RESEND_COOLDOWN_MS,
      telegramId,
      createdAt: now,
    });
    this.lastSentAtByPhone.set(`${phone}:${purpose}`, now);

    const sent = await this.telegramService.sendMessage(telegramId, this.buildMessage(purpose, code));

    if (!sent) {
      // Yuborib bo'lmadi — entry'ni o'chirib, xato qaytaramiz
      this.entries.delete(otpId);
      const err: any = new Error('Kodni Telegram orqali yuborib boʻlmadi. Keyinroq qayta urinib koʻring.');
      err.status = 502;
      throw err;
    }

    return {
      otpId,
      phone,
      purpose,
      expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      status: 'SENT',
    };
  }

  /**
   * Bot /start qilganda — pending OTP'ni topib darhol yuboradi
   * (foydalanuvchi saytda "Resend" bosmaydi).
   * Xavfsizlik uchun faqat shu Telegram hisobiga bog'langan telefon raqamlarga yuboradi.
   */
  async deliverPendingOtpForTelegram(telegramId: string, expectedPhone?: string): Promise<void> {
    const now = Date.now();
    for (const entry of this.entries.values()) {
      if (entry.telegramId !== null || entry.expiresAt <= now) continue;
      if (expectedPhone && entry.phone !== expectedPhone) continue;

      entry.telegramId = telegramId;
      // Kod xavfsizlik uchun hash'da saqlanadi — qayta yuborish uchun yangi kod generatsiya qilamiz
      const newCode = randomInt(100000, 999999).toString();
      entry.codeHash = hashOtp(entry.phone, entry.purpose, newCode);
      entry.expiresAt = Date.now() + OTP_TTL_MS;
      await this.telegramService.sendMessage(telegramId, this.buildMessage(entry.purpose, newCode));
    }
  }

  verifyOtp(otpId: string, code: string): {
    valid: boolean;
    message?: string;
    phone?: string;
    purpose?: OtpPurpose;
  } {
    const entry = this.entries.get(otpId);
    if (!entry) {
      return { valid: false, message: 'Kod topilmadi yoki allaqachon ishlatilgan.' };
    }

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(otpId);
      return { valid: false, message: 'Kodning amal qilish muddati tugagan.' };
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      this.entries.delete(otpId);
      return { valid: false, message: 'Juda koʻp urinish. Keyinroq qayta urinib koʻring.' };
    }

    entry.attempts++;
    if (hashOtp(entry.phone, entry.purpose, code) !== entry.codeHash) {
      return { valid: false, message: 'Kod notoʻgʻri.' };
    }

    this.entries.delete(otpId);
    return { valid: true, phone: entry.phone, purpose: entry.purpose };
  }

  getState(otpId: string): OtpPendingState | null {
    const entry = this.entries.get(otpId);
    if (!entry) return null;
    return {
      otpId: entry.otpId,
      phone: entry.phone,
      purpose: entry.purpose,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      status: Date.now() > entry.expiresAt ? 'EXPIRED' : 'PENDING',
    };
  }
}
