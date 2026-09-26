import { Body, Controller, HttpCode, HttpStatus, Inject, Post, forwardRef } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpService, OtpPurpose } from './otp.service';
import { AuthService } from '../auth/auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';

@Controller('otp')
export class OtpController {
  constructor(
    private otpService: OtpService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async request(@Body() dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto.phoneNumber, dto.purpose as OtpPurpose);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyOtpDto) {
    const result = await this.otpService.verifyOtp(dto.otpId, dto.code);
    if (!result.valid) {
      const err: any = new Error(result.message || 'Kod notoʻgʻri.');
      err.status = result.code === 'TOO_MANY_ATTEMPTS' ? 429 : 400;
      err.getResponse = () => ({ message: result.message, code: result.code });
      throw err;
    }

    // LOGIN maqsadi: kod to'g'ri bo'lsa — foydalanuvchini tizimga kiritamiz
    if (result.purpose === 'LOGIN' && result.phone) {
      const tokens = await this.authService.loginByOtp(result.phone);
      return { verified: true, ...tokens };
    }

    return { verified: true };
  }

  /**
   * Parolni tiklash — PASSWORD_RESET OTP orqali.
   * Kod tasdiqlanganda DARHOL yangi parol o'rnatiladi (yakka so'rovda yakunlanadi).
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordOtpDto) {
    const result = await this.otpService.verifyOtp(dto.otpId, dto.code);
    if (!result.valid) {
      const err: any = new Error(result.message || 'Kod notoʻgʻri.');
      err.status = result.code === 'TOO_MANY_ATTEMPTS' ? 429 : 400;
      err.getResponse = () => ({ message: result.message, code: result.code });
      throw err;
    }

    if (result.purpose !== 'PASSWORD_RESET' || !result.phone) {
      const err: any = new Error('Bu kod parolni tiklash uchun emas.');
      err.status = 400;
      throw err;
    }

    await this.authService.resetPassword(result.phone, '__OTP_VERIFIED__', dto.newPassword);
    return { success: true, message: 'Parolingiz muvaffaqiyatli yangilandi. Endi yangi parol bilan kiring.' };
  }
}
