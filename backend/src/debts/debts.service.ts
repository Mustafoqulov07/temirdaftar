import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto } from './dto/create-debt.dto';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateDebtDto) {
    // Mijoz ushbu do'konga tegishli ekanligini tekshiramiz (xavfsizlik uchun)
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, storeId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    // Jami summani hisoblaymiz va tovarlarni saqlash formatiga o'tkazamiz
    let totalAmount = 0;
    const debtItemsData = dto.items.map((item) => {
      const totalPrice = Math.round(item.quantity * item.pricePerUnit * 100) / 100;
      totalAmount += totalPrice;
      return {
        productName: item.productName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice,
      };
    });
    totalAmount = Math.round(totalAmount * 100) / 100;

    // Tranzaksiya orqali qarzni yaratamiz va mijozning umumiy balansini oshiramiz
    const debt = await this.prisma.$transaction(async (tx) => {
      const newDebt = await tx.debt.create({
        data: {
          customerId: dto.customerId,
          totalAmount,
          dueDate: new Date(dto.dueDate),
          comment: dto.comment || null,
          items: {
            create: debtItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Mijoz balansini yangilash
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          totalDebt: {
            increment: totalAmount,
          },
          lastActivityAt: new Date(),
        },
      });

      return newDebt;
    });

    return debt;
  }
}
