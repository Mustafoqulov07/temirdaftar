import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998XXXXXXXXX formatida boʻlishi kerak',
  })
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
