import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998XXXXXXXXX formatida boʻlishi kerak',
  })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @Length(6, 20, { message: 'Parol uzunligi 6 dan 20 gacha boʻlishi kerak' })
  password?: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 50, { message: 'Ism uzunligi 3 dan 50 gacha boʻlishi kerak' })
  fullName: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100, { message: 'Doʻkon nomi uzunligi 2 dan 100 gacha boʻlishi kerak' })
  storeName: string;

  @IsOptional()
  @IsString()
  telegramId?: string;
}
