import { Test } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

describe('OtpService — pending REGISTER OTP va bot orqali yetkazish', () => {
  let otpService: OtpService;
  const findUnique = jest.fn();
  const getBotUsername = jest.fn();
  const sendMessage = jest.fn();

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T10:00:00Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: { user: { findUnique } } },
        { provide: TelegramService, useValue: { getBotUsername, sendMessage } },
      ],
    }).compile();

    otpService = moduleRef.get(OtpService);
    findUnique.mockResolvedValue(null); // foydalanuvchi bazada yo'q (yangi raqam)
    getBotUsername.mockResolvedValue('test_bot');
    sendMessage.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('requestOtp (BOT_NOT_STARTED) — pending REGISTER OTP yaratadi va hasPendingOtpForPhone true qaytaradi', async () => {
    const state = await otpService.requestOtp('+998901234567', 'REGISTER');
    expect(state.status).toBe('BOT_NOT_STARTED');
    expect(otpService.hasPendingOtpForPhone('+998901234567', 'REGISTER')).toBe(true);
  });

  it('boshqa telefon yoki boshqa purpose uchun false qaytadi', async () => {
    await otpService.requestOtp('+998901234567', 'REGISTER');
    expect(otpService.hasPendingOtpForPhone('+998909898989', 'REGISTER')).toBe(false);
    expect(otpService.hasPendingOtpForPhone('+998901234567', 'LOGIN')).toBe(false);
  });

  it('kontakt kelganda kod yetkaziladi va entry "ishlatilgan" bo\'ladi', async () => {
    await otpService.requestOtp('+998901234567', 'REGISTER');

    await otpService.deliverPendingOtpForTelegram('111', '+998901234567');

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toBe('111');
    // Yetkazilgandan keyin pending hisoblanmaydi — qayta yuborilmaydi
    expect(otpService.hasPendingOtpForPhone('+998901234567', 'REGISTER')).toBe(false);
  });

  it('OTP muddati tugasa ham 10 daqiqa oynasida kod yetkaziladi (botga kech qo\'lgan holat)', async () => {
    await otpService.requestOtp('+998901234567', 'REGISTER');

    // 5 daqiqa o'tdi: OTP_TTL (2 daqiqa) tugagan, lekin linger oynasi (10 daqiqa) ichida
    jest.setSystemTime(new Date('2026-10-05T10:05:00Z'));

    await otpService.deliverPendingOtpForTelegram('111', '+998901234567');
    expect(sendMessage).toHaveBeenCalledTimes(1);

    // Yetkazilganidan keyin yangi kod 2 daqiqa amal qiladi
    const state = otpService.getState(
      [...(otpService as any).entries.keys()][0],
    );
    expect(state?.status).toBe('PENDING');
  });

  it('10 daqiqadan keyin pending hisoblanmaydi — bot o\'z hisob yaratishiga to\'sqinlik qilmaydi', async () => {
    await otpService.requestOtp('+998901234567', 'REGISTER');

    // 11 daqiqa o'tdi
    jest.setSystemTime(new Date('2026-10-05T10:11:00Z'));

    expect(otpService.hasPendingOtpForPhone('+998901234567', 'REGISTER')).toBe(false);
    await otpService.deliverPendingOtpForTelegram('111', '+998901234567');
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
