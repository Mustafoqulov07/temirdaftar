import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'Mijoz identifikatori tanlanishi shart' })
  @IsString()
  customerId: string;

  @IsNotEmpty({ message: 'Toʻlov summasi kiritilishi shart' })
  @IsNumber()
  @Min(0.01, { message: 'Toʻlov summasi kamida 0.01 boʻlishi kerak' })
  amount: number;

  @IsOptional()
  @IsDateString({}, { message: 'Sana toʻgʻri formatda boʻlishi kerak' })
  paymentDate?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
