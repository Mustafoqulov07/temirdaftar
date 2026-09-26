import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998XXXXXXXXX formatida boʻlishi kerak',
  })
  phoneNumber: string;

  @IsIn(['REGISTER', 'LOGIN', 'PASSWORD_RESET'], {
    message: 'OTP maqsadi notoʻgʻri',
  })
  purpose: string;
}
