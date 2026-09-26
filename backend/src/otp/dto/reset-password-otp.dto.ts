import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ResetPasswordOtpDto {
  @IsNotEmpty({ message: 'OTP identifikatori kiritilishi shart' })
  @IsString()
  otpId: string;

  @IsNotEmpty({ message: 'Tasdiqlash kodi kiritilishi shart' })
  @IsString()
  @Length(6, 6, { message: 'Kod 6 xonali boʻlishi kerak' })
  @Matches(/^\d{6}$/, { message: 'Kod faqat raqamlardan iborat boʻlishi kerak' })
  code: string;

  @IsNotEmpty({ message: 'Yangi parol kiritilishi shart' })
  @IsString()
  @Length(6, 20, { message: 'Parol uzunligi 6 dan 20 gacha boʻlishi kerak' })
  newPassword: string;
}
