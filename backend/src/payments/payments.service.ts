import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreatePaymentDto) {
    // Mijoz ushbu do'konga tegishli ekanligini tekshiramiz (xavfsizlik uchun)
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, storeId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    // To'lov summasi mijoz qarzidan oshib ketmasligini tekshiramiz
    const currentDebt = Number(customer.totalDebt);
    if (dto.amount > currentDebt) {
      throw new BadRequestException(
        `To'lov summasi (${dto.amount}) mijozning jami qarzidan (${currentDebt}) oshib ketdi`,
      );
    }
    // Tranzaksiya orqali to'lovni yaratamiz va mijozning umumiy balansini kamaytiramiz
    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          amount: dto.amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          comment: dto.comment || null,
        },
      });

      // Mijoz balansini kamaytirish (qarzni yopish)
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          totalDebt: {
            decrement: dto.amount,
          },
          lastActivityAt: new Date(),
        },
      });

      return newPayment;
    });

    return payment;
  }
}
