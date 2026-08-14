import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(storeId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Jami faol mijozlar soni
    const totalCustomers = await this.prisma.customer.count({
      where: { storeId, deletedAt: null },
    });

    // 2. Jami qarzdorlik summasi (faol mijozlardan) va 6. Top-5 qarzdor mijozlar
    const activeCustomers = await this.prisma.customer.findMany({
      where: { storeId, deletedAt: null },
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

    let totalDebtSum = 0;
    const customerDebtsMap = new Map<string, number>();

    for (const c of activeCustomers) {
      const totalDebtAmount = c.debts.reduce((sum, d) => {
        return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
      }, 0);
      const totalPaymentAmount = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const netDebt = totalDebtAmount - totalPaymentAmount;
      totalDebtSum += netDebt;
      customerDebtsMap.set(c.id, netDebt);
    }

    // 3. Bugun tushgan to‘lovlar summasi
    const todayPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        customer: { storeId, deletedAt: null },
        paymentDate: { gte: startOfToday, lte: endOfToday },
        deletedAt: null,
      },
    });
    const todayPaymentsSum = Number(todayPayments._sum.amount || 0);

    // 4. Muddati o‘tgan umumiy qarzlar summasi
    const overdueDebtsList = await this.prisma.debt.findMany({
      where: {
        customer: { storeId, deletedAt: null },
        dueDate: { lt: startOfToday },
        isPaid: false,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });
    const overdueDebtsSum = overdueDebtsList.reduce((sum, d) => {
      return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
    }, 0);

    // 5. Bugun to‘lanishi kerak bo‘lgan qarzlar summasi
    const todayDebtsList = await this.prisma.debt.findMany({
      where: {
        customer: { storeId, deletedAt: null },
        dueDate: { gte: startOfToday, lte: endOfToday },
        isPaid: false,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });
    const todayDebtsSum = todayDebtsList.reduce((sum, d) => {
      return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
    }, 0);

    // 6. Eng ko‘p qarzdor mijozlar (Top-5)
    const topCustomers = activeCustomers
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        totalDebt: customerDebtsMap.get(c.id) || 0,
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
        const amount = d.items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.pricePerUnit), 0);
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
    };
  }
}
