import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { netDebtOf, allocatePaymentsFIFO, withSerializableRetry, round2 } from '../common/debt-math';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreatePaymentDto) {
    return withSerializableRetry(async () => {
      return this.prisma.$transaction(
        async (tx) => {
          // Mijoz ushbu do'konga tegishli ekanligini tekshiramiz (xavfsizlik uchun)
          const customer = await tx.customer.findFirst({
            where: { id: dto.customerId, storeId, deletedAt: null },
            include: {
              debts: {
                where: { deletedAt: null },
                include: { items: true },
                orderBy: { createdAt: 'asc' },
              },
              payments: {
                where: { deletedAt: null },
              },
            },
          });

          if (!customer) {
            throw new NotFoundException('Mijoz topilmadi');
          }

          // Mijozning hozirgi sof qarzini hisoblaymiz
          const roundedCurrentDebt = netDebtOf(customer.debts, customer.payments);
          const roundedAmount = round2(dto.amount);

          if (roundedAmount > roundedCurrentDebt) {
            throw new BadRequestException(
              `To'lov summasi (${dto.amount}) mijozning jami qarzidan (${Math.max(roundedCurrentDebt, 0)}) oshib ketdi`,
            );
          }

          // To'lovni tranzaksiya ICHIDA yaratamiz — parallel so'rovlar navbatma-navbat ishlaydi
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
            data: { lastActivityAt: new Date() },
          });

          // isPaid holatini FIFO bo'yicha yangilaymiz (umumiy helper orqali).
          // Yangi holat: (eski to'lovlar + yangi to'lov) qarzlar bo'yicha taqsimlanadi.
          const totalPaidAfter = round2(
            customer.payments.reduce((s, p) => s + Number(p.amount), 0) + roundedAmount,
          );
          const allocation = allocatePaymentsFIFO(customer.debts, totalPaidAfter);

          for (const [debtId, a] of allocation) {
            const current = customer.debts.find((d) => d.id === debtId);
            if (current && current.isPaid !== a.isPaid) {
              await tx.debt.update({
                where: { id: debtId },
                data: { isPaid: a.isPaid },
              });
            }
          }

          return newPayment;
        },
        { isolationLevel: 'Serializable' },
      );
    });
  }
}
