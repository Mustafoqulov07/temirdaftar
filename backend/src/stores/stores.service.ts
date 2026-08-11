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

    // 2. Jami qarzdorlik summasi (faol mijozlardan)
    const totalDebtAgg = await this.prisma.customer.aggregate({
      _sum: { totalDebt: true },
      where: { storeId, deletedAt: null },
    });
    const totalDebtSum = Number(totalDebtAgg._sum.totalDebt || 0);

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
    const overdueDebts = await this.prisma.debt.aggregate({
      _sum: { totalAmount: true },
      where: {
        customer: { storeId, deletedAt: null },
        dueDate: { lt: startOfToday },
        isPaid: false,
        deletedAt: null,
      },
    });
    const overdueDebtsSum = Number(overdueDebts._sum.totalAmount || 0);

    // 5. Bugun to‘lanishi kerak bo‘lgan qarzlar summasi
    const todayDebts = await this.prisma.debt.aggregate({
      _sum: { totalAmount: true },
      where: {
        customer: { storeId, deletedAt: null },
        dueDate: { gte: startOfToday, lte: endOfToday },
        isPaid: false,
        deletedAt: null,
      },
    });
    const todayDebtsSum = Number(todayDebts._sum.totalAmount || 0);

    // 6. Eng ko‘p qarzdor mijozlar (Top-5)
    const topCustomers = await this.prisma.customer.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { totalDebt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        totalDebt: true,
      },
    });

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
      ...lastDebts.map((d) => ({
        id: d.id,
        type: 'DEBT',
        amount: Number(d.totalAmount),
        date: d.createdAt,
        customerName: d.customer.fullName,
        comment: d.comment,
      })),
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
