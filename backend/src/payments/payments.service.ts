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
    const currentDebt = Math.max(0, totalDebtAmount - totalPaymentAmount);
    const roundedCurrentDebt = Math.round(currentDebt * 100) / 100;
    const roundedAmount = Math.round(dto.amount * 100) / 100;

    if (roundedAmount > roundedCurrentDebt) {
      throw new BadRequestException(
        `To'lov summasi (${dto.amount}) mijozning jami qarzidan (${roundedCurrentDebt}) oshib ketdi`,
      );
    }

    // Tranzaksiya orqali to'lovni yaratamiz, oxirgi faollik vaqtini va qarzlar isPaid holatini yangilaymiz
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

      // Barcha qarzlar bo'yicha isPaid holatini yangilaymiz (FIFO - eng eski qarzdan boshlab)
      const allDebts = await tx.debt.findMany({
        where: { customerId: dto.customerId, deletedAt: null },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });

      const allPayments = await tx.payment.findMany({
        where: { customerId: dto.customerId, deletedAt: null },
      });

      let remainingPayment = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      for (const d of allDebts) {
        const debtTotal = d.items.reduce(
          (sum, i) => sum + Number(i.quantity) * Number(i.pricePerUnit),
          0,
        );
        const roundedDebtTotal = Math.round(debtTotal * 100) / 100;
        const isDebtFullyPaid = Math.round(remainingPayment * 100) / 100 >= roundedDebtTotal;

        if (d.isPaid !== isDebtFullyPaid) {
          await tx.debt.update({
            where: { id: d.id },
            data: { isPaid: isDebtFullyPaid },
          });
        }

        if (remainingPayment >= roundedDebtTotal) {
          remainingPayment = Math.round((remainingPayment - roundedDebtTotal) * 100) / 100;
        } else {
          remainingPayment = 0;
        }
      }

      return newPayment;
    });

    return payment;
  }
}
