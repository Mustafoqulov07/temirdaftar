import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'OTP identifikatori kiritilishi shart' })
  @IsString()
  otpId: string;

  @IsNotEmpty({ message: 'Tasdiqlash kodi kiritilishi shart' })
  @IsString()
  @Length(6, 6, { message: 'Kod 6 xonali boʻlishi kerak' })
  @Matches(/^\d{6}$/, { message: 'Kod faqat raqamlardan iborat boʻlishi kerak' })
  code: string;
}
