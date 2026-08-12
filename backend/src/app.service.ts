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
      debtsSum,
      paymentsSum,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { telegramId: { not: null } } }),
      this.prisma.store.count(),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.debt.count({ where: { deletedAt: null } }),
      this.prisma.payment.count({ where: { deletedAt: null } }),
      this.prisma.debt.aggregate({
        where: { deletedAt: null },
        _sum: { totalAmount: true },
      }),
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

    return {
      summary: {
        totalUsers: usersCount,
        telegramConnectedUsers: telegramUsersCount,
        totalStores: storesCount,
        totalCustomers: customersCount,
        totalDebtsCount: debtsCount,
        totalDebtsAmount: debtsSum._sum.totalAmount || 0,
        totalPaymentsCount: paymentsCount,
        totalPaymentsAmount: paymentsSum._sum.amount || 0,
      },
      recentUsers: recentUsers.map(u => ({
        ...u,
        hasTelegram: !!u.telegramId,
      })),
    };
  }
}
