import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello() {
    return {
      status: 'ok',
      name: 'Temirdaftar API',
      version: '1.0.0',
      api: '/api',
      endpoints: {
        auth: '/api/auth',
        stores: '/api/stores',
        customers: '/api/customers',
        debts: '/api/debts',
        payments: '/api/payments',
        stats: '/api/stats',
      },
    };
  }

  async getStats() {
    const [
      usersCount,
      telegramUsersCount,
      storesCount,
      customersCount,
      debtsCount,
      paymentsCount,
      paymentsSum,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { telegramId: { not: null } } }),
      this.prisma.store.count(),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.debt.count({ where: { deletedAt: null } }),
      this.prisma.payment.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          telegramId: true,
          createdAt: true,
        },
      }),
    ]);

    // Barcha qarz tovarlarini hisoblaymiz (debtsSum o'rniga)
    const debtItems = await this.prisma.debtItem.findMany({
      where: {
        debt: { deletedAt: null },
      },
    });

    const totalDebtsAmount = debtItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
      0,
    );

    return {
      summary: {
        totalUsers: usersCount,
        telegramConnectedUsers: telegramUsersCount,
        totalStores: storesCount,
        totalCustomers: customersCount,
        totalDebtsCount: debtsCount,
        totalDebtsAmount,
        totalPaymentsCount: paymentsCount,
        totalPaymentsAmount: paymentsSum._sum.amount || 0,
      },
      recentUsers: recentUsers.map((u) => ({
        ...u,
        hasTelegram: !!u.telegramId,
      })),
    };
  }
}
