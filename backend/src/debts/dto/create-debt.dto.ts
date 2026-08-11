import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DebtItemDto {
  @IsNotEmpty({ message: 'Mahsulot nomi boʻsh boʻlmasligi kerak' })
  @IsString()
  productName: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Miqdor kamida 0.01 boʻlishi kerak' })
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Narx 0 dan kam boʻlmasligi kerak' })
  pricePerUnit: number;
}

export class CreateDebtDto {
  @IsNotEmpty({ message: 'Mijoz identifikatori tanlanishi shart' })
  @IsString()
  customerId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1, { message: 'Kamida bitta mahsulot kiritilishi kerak' })
  @ValidateNested({ each: true })
  @Type(() => DebtItemDto)
  items: DebtItemDto[];

  @IsNotEmpty({ message: 'Toʻlov muddati kiritilishi shart' })
  @IsDateString({}, { message: 'Muddati toʻgʻri sana formatida boʻlishi kerak' })
  dueDate: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
