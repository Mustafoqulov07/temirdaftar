import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'Mijoz ismi kiritilishi shart' })
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998XXXXXXXXX formatida boʻlishi kerak',
  })
  phoneNumber?: string;
}
