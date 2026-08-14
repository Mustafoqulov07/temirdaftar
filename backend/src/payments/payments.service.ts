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
      include: {
        debts: {
          where: { deletedAt: null },
          include: {
            items: true,
          },
        },
        payments: {
          where: { deletedAt: null },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    // Mijozning hozirgi qarzini hisoblaymiz
    const totalDebtAmount = customer.debts.reduce((sum, d) => {
      return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
    }, 0);
    const totalPaymentAmount = customer.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const currentDebt = totalDebtAmount - totalPaymentAmount;

    if (dto.amount > currentDebt) {
      throw new BadRequestException(
        `To'lov summasi (${dto.amount}) mijozning jami qarzidan (${currentDebt}) oshib ketdi`,
      );
    }

    // Tranzaksiya orqali to'lovni yaratamiz va oxirgi faollik vaqtini yangilaymiz
    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          amount: dto.amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          comment: dto.comment || null,
        },
      });

      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          lastActivityAt: new Date(),
        },
      });

      return newPayment;
    });

    return payment;
  }
}
