import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  async getGlobalStats() {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalStores,
      totalCustomers,
      telegramUsersCount,
      debtsCount,
      paymentsCount,
      paymentsSum,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBlocked: false } }),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.store.count(),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { telegramId: { not: null } } }),
      this.prisma.debt.count({ where: { deletedAt: null } }),
      this.prisma.payment.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const debtItems = await this.prisma.debtItem.findMany({
      where: { debt: { deletedAt: null } },
      select: { quantity: true, pricePerUnit: true },
    });

    const totalDebtsSum = debtItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
      0,
    );
    const totalPaymentsSum = Number(paymentsSum._sum.amount || 0);

    const recentStores = await this.prisma.store.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            telegramId: true,
            isBlocked: true,
            role: true,
          },
        },
        _count: {
          select: { customers: true },
        },
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      recentDebtItems,
      prevDebtItems,
      recentPaymentsAgg,
      prevPaymentsAgg,
      recentStoresCount,
      prevStoresCount,
      recentCustomersCount,
      prevCustomersCount,
    ] = await Promise.all([
      this.prisma.debtItem.findMany({
        where: {
          debt: {
            deletedAt: null,
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        select: { quantity: true, pricePerUnit: true },
      }),
      this.prisma.debtItem.findMany({
        where: {
          debt: {
            deletedAt: null,
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        },
        select: { quantity: true, pricePerUnit: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          paymentDate: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          paymentDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.store.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.store.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({
        where: { deletedAt: null, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const recentDebtsSum = recentDebtItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
      0,
    );
    const prevDebtsSum = prevDebtItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
      0,
    );

    const recentPaymentsSum = Number(recentPaymentsAgg._sum.amount || 0);
    const prevPaymentsSum = Number(prevPaymentsAgg._sum.amount || 0);

    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) {
        if (curr === 0) return { percent: 0, direction: 'neutral' as const };
        return { percent: 100, direction: 'up' as const };
      }
      const diff = ((curr - prev) / prev) * 100;
      const rounded = Math.round(Math.abs(diff) * 10) / 10;
      return {
        percent: rounded,
        direction: diff > 0 ? ('up' as const) : diff < 0 ? ('down' as const) : ('neutral' as const),
      };
    };

    // 7-day timeline for visual trends
    const timeline: Array<{
      date: string;
      label: string;
      debts: number;
      payments: number;
    }> = [];

    const weekDays = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayDebtItems = await this.prisma.debtItem.findMany({
        where: {
          debt: {
            deletedAt: null,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        },
        select: { quantity: true, pricePerUnit: true },
      });

      const dayPayments = await this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          paymentDate: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      });

      const debtsSum = dayDebtItems.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
        0,
      );
      const paymentsSumTotal = Number(dayPayments._sum.amount || 0);

      timeline.push({
        date: startOfDay.toISOString().split('T')[0],
        label: `${weekDays[startOfDay.getDay()]} (${startOfDay.getDate()})`,
        debts: debtsSum,
        payments: paymentsSumTotal,
      });
    }

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      totalStores,
      totalCustomers,
      telegramUsersCount,
      debtsCount,
      paymentsCount,
      totalDebtsSum,
      totalPaymentsSum,
      totalBalance: totalDebtsSum - totalPaymentsSum,
      trends: {
        debts: calcTrend(recentDebtsSum, prevDebtsSum),
        payments: calcTrend(recentPaymentsSum, prevPaymentsSum),
        stores: calcTrend(recentStoresCount, prevStoresCount),
        customers: calcTrend(recentCustomersCount, prevCustomersCount),
      },
      timeline,
      recentStores: recentStores.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        createdAt: s.createdAt,
        ownerName: s.user.fullName,
        ownerPhone: s.user.phoneNumber,
        isBlocked: s.user.isBlocked,
        role: s.user.role,
        customerCount: s._count.customers,
      })),
    };
  }

  async getAllStores(search?: string) {
    const whereClause: any = {};
    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const stores = await this.prisma.store.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            telegramId: true,
            isBlocked: true,
            role: true,
            createdAt: true,
          },
        },
        customers: {
          where: { deletedAt: null },
          select: {
            id: true,
            debts: {
              where: { deletedAt: null },
              select: {
                items: {
                  select: { quantity: true, pricePerUnit: true },
                },
              },
            },
            payments: {
              where: { deletedAt: null },
              select: { amount: true },
            },
          },
        },
      },
    });

    return stores.map((s) => {
      let storeDebtSum = 0;
      let storePaymentSum = 0;

      for (const cust of s.customers) {
        for (const debt of cust.debts) {
          for (const item of debt.items) {
            storeDebtSum += Number(item.quantity) * Number(item.pricePerUnit);
          }
        }
        for (const payment of cust.payments) {
          storePaymentSum += Number(payment.amount);
        }
      }

      return {
        id: s.id,
        name: s.name,
        address: s.address,
        createdAt: s.createdAt,
        user: s.user,
        customerCount: s.customers.length,
        totalDebtSum: storeDebtSum,
        totalPaymentSum: storePaymentSum,
        balance: storeDebtSum - storePaymentSum,
      };
    });
  }

  async getStoreDetails(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            telegramId: true,
            isBlocked: true,
            role: true,
            createdAt: true,
          },
        },
        customers: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            debts: {
              where: { deletedAt: null },
              include: { items: true },
            },
            payments: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Doʻkon topilmadi');
    }

    const customersFormatted = store.customers.map((c) => {
      const debtSum = c.debts.reduce(
        (sum, d) =>
          sum +
          d.items.reduce(
            (iSum, item) => iSum + Number(item.quantity) * Number(item.pricePerUnit),
            0,
          ),
        0,
      );
      const paymentSum = c.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      return {
        id: c.id,
        serialId: c.serialId,
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        lastActivityAt: c.lastActivityAt,
        createdAt: c.createdAt,
        debtsCount: c.debts.length,
        paymentsCount: c.payments.length,
        totalDebt: debtSum,
        totalPaid: paymentSum,
        balance: debtSum - paymentSum,
      };
    });

    // Recent debts and payments for this store
    const recentDebts = await this.prisma.debt.findMany({
      where: {
        customer: { storeId: store.id },
        deletedAt: null,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, fullName: true, phoneNumber: true } },
        items: true,
      },
    });

    const recentPayments = await this.prisma.payment.findMany({
      where: {
        customer: { storeId: store.id },
        deletedAt: null,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });

    return {
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        createdAt: store.createdAt,
        user: store.user,
      },
      customers: customersFormatted,
      recentDebts: recentDebts.map((d) => ({
        id: d.id,
        customer: d.customer,
        dueDate: d.dueDate,
        comment: d.comment,
        createdAt: d.createdAt,
        isPaid: d.isPaid,
        total: d.items.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
          0,
        ),
        items: d.items,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        customer: p.customer,
        amount: Number(p.amount),
        comment: p.comment,
        paymentDate: p.paymentDate,
        createdAt: p.createdAt,
      })),
    };
  }

  async toggleStoreBlock(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { user: true },
    });

    if (!store) {
      throw new NotFoundException('Doʻkon topilmadi');
    }

    if (store.user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Super Admin foydalanuvchisini bloklash mumkin emas!');
    }

    const newBlockedStatus = !store.user.isBlocked;
    await this.prisma.user.update({
      where: { id: store.user.id },
      data: { isBlocked: newBlockedStatus },
    });

    return {
      storeId: store.id,
      userId: store.user.id,
      isBlocked: newBlockedStatus,
      message: newBlockedStatus
        ? 'Doʻkon va uning egasi muvaffaqiyatli bloklandi'
        : 'Doʻkon blokdan chiqarildi',
    };
  }

  async resetStorePassword(storeId: string, newPassword: string) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat boʻlishi kerak');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { user: true },
    });

    if (!store) {
      throw new NotFoundException('Doʻkon topilmadi');
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await this.prisma.user.update({
      where: { id: store.user.id },
      data: { passwordHash },
    });

    return {
      success: true,
      message: `${store.name} doʻkoni egasi paroli muvaffaqiyatli yangilandi`,
    };
  }

  async broadcastMessage(message: string) {
    if (!message || !message.trim()) {
      throw new BadRequestException('Xabar matni boʻsh boʻlishi mumkin emas');
    }

    const usersWithTelegram = await this.prisma.user.findMany({
      where: { telegramId: { not: null } },
      select: { id: true, fullName: true, telegramId: true },
    });

    let sent = 0;
    let failed = 0;

    const formattedMessage = `📢 *TIZIM BILDIRISHNOMASI*\n\n${message.trim()}`;

    for (const u of usersWithTelegram) {
      if (u.telegramId) {
        const ok = await this.telegramService.sendMessage(u.telegramId, formattedMessage);
        if (ok) {
          sent++;
        } else {
          failed++;
        }
      }
    }

    return {
      total: usersWithTelegram.length,
      sent,
      failed,
      message: `${sent} ta Telegram foydalanuvchisiga xabar muvaffaqiyatli yuborildi`,
    };
  }
}
