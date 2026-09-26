import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { debtTotalOf, netDebtOf, allocatePaymentsFIFO, round2 } from '../common/debt-math';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(storeId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Jami faol mijozlar soni
    const totalCustomers = await this.prisma.customer.count({
      where: { storeId, deletedAt: null },
    });

    // 2. Faol mijozlar va ularning qarz/to'lov tarixi
    const activeCustomers = await this.prisma.customer.findMany({
      where: { storeId, deletedAt: null },
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

    let totalDebtSum = 0;
    // customerId -> FIFO taqsimlangan qarzlar (to'langan qismlari bilan)
    const customerAllocations = new Map<string, Map<string, { total: number; paidPortion: number; isPaid: boolean }>>();
    // customerId -> sof qarz (manfiy bo'lishi mumkin — ortiqcha to'lov)
    const customerNetDebtMap = new Map<string, number>();

    for (const c of activeCustomers) {
      const netDebt = netDebtOf(c.debts, c.payments);
      customerNetDebtMap.set(c.id, netDebt);
      totalDebtSum += netDebt;
      customerAllocations.set(c.id, allocatePaymentsFIFO(c.debts, c.payments.reduce((s, p) => s + Number(p.amount), 0)));
    }
    totalDebtSum = round2(totalDebtSum);

    // 3. Bugun tushgan to'lovlar summasi
    const todayPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        customer: { storeId, deletedAt: null },
        paymentDate: { gte: startOfToday, lte: endOfToday },
        deletedAt: null,
      },
    });
    const todayPaymentsSum = Number(todayPayments._sum.amount || 0);

    /**
     * Berilgan sana oralig'idagi muddati kelgan qarzlar uchun TO'LANMAGAN qoldiqni hisoblaydi.
     * Muhim: FIFO taqsimotdan foydalanamiz — ya'ni faqat o'sha qarzning hali to'lanmagan qismi qo'shiladi.
     */
    const sumUnpaidForDueRange = async (from: Date, to: Date): Promise<number> => {
      const dueDebts = await this.prisma.debt.findMany({
        where: {
          customer: { storeId, deletedAt: null },
          dueDate: { gte: from, lte: to },
          deletedAt: null,
        },
        include: { items: true },
      });

      let sum = 0;
      for (const d of dueDebts) {
        const allocation = customerAllocations.get(d.customerId)?.get(d.id);
        const unpaid = allocation ? round2(allocation.total - allocation.paidPortion) : debtTotalOf(d.items);
        if (unpaid > 0) sum += unpaid;
      }
      return round2(sum);
    };

    // 4. Muddati o'tgan qarzlar (to'lanmagan qismlari)
    const overdueDebtsSum = await sumUnpaidForDueRange(new Date(0), new Date(startOfToday.getTime() - 1));

    // 5. Bugun to'lanishi kerak bo'lgan qarzlar (to'lanmagan qismlari)
    const todayDebtsSum = await sumUnpaidForDueRange(startOfToday, endOfToday);

    // 6. Eng ko'p qarzdor mijozlar (Top-5)
    const topCustomers = activeCustomers
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        totalDebt: customerNetDebtMap.get(c.id) || 0,
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 5);

    // 7. Oxirgi 10 ta operatsiyalar logi (Qarz va To'lovlar aralash)
    const lastDebts = await this.prisma.debt.findMany({
      where: {
        customer: { storeId, deletedAt: null },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { fullName: true } },
        items: true,
      },
    });

    const lastPayments = await this.prisma.payment.findMany({
      where: {
        customer: { storeId, deletedAt: null },
        deletedAt: null,
      },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: {
        customer: { select: { fullName: true } },
      },
    });

    const activities = [
      ...lastDebts.map((d) => {
        const amount = debtTotalOf(d.items);
        return {
          id: d.id,
          type: 'DEBT',
          amount,
          date: d.createdAt,
          customerName: d.customer.fullName,
          comment: d.comment,
        };
      }),
      ...lastPayments.map((p) => ({
        id: p.id,
        type: 'PAYMENT',
        amount: Number(p.amount),
        date: p.paymentDate,
        customerName: p.customer.fullName,
        comment: p.comment,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // 8. 7 kunlik trend (bugun + oldingi 6 kun): har kungi qarz va to'lov summalari
    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);

    const [trendDebts, trendPayments] = await Promise.all([
      this.prisma.debt.findMany({
        where: {
          customer: { storeId, deletedAt: null },
          createdAt: { gte: startOf7DaysAgo },
          deletedAt: null,
        },
        include: { items: true },
      }),
      this.prisma.payment.findMany({
        where: {
          customer: { storeId, deletedAt: null },
          paymentDate: { gte: startOf7DaysAgo },
          deletedAt: null,
        },
      }),
    ]);

    const dayLabels = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];
    const trend: { label: string; debts: number; payments: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfToday);
      dayStart.setDate(dayStart.getDate() - (6 - i));
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const debtsSum = trendDebts
        .filter((d) => d.createdAt >= dayStart && d.createdAt <= dayEnd)
        .reduce((s, d) => s + debtTotalOf(d.items), 0);
      const paymentsSum = trendPayments
        .filter((p) => p.paymentDate >= dayStart && p.paymentDate <= dayEnd)
        .reduce((s, p) => s + Number(p.amount), 0);

      trend.push({
        label: dayLabels[dayStart.getDay()],
        debts: round2(debtsSum),
        payments: round2(paymentsSum),
      });
    }

    return {
      metrics: {
        totalCustomers,
        totalDebtSum,
        todayPaymentsSum,
        overdueDebtsSum,
        todayDebtsSum,
      },
      topCustomers,
      activities,
      trend,
    };
  }
}
