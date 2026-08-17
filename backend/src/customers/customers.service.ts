import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber || null,
        storeId,
      },
    });
  }

  async findAll(storeId: string, search?: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        storeId,
        deletedAt: null,
      },
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
      orderBy: {
        fullName: 'asc',
      },
    });

    const mapped = customers.map((c) => {
      const totalDebtAmount = c.debts.reduce((sum, d) => {
        return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
      }, 0);
      const totalPaymentAmount = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        id: c.id,
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        lastActivityAt: c.lastActivityAt,
        createdAt: c.createdAt,
        totalDebt: totalDebtAmount - totalPaymentAmount,
      };
    });

    if (search) {
      const s = search.toLowerCase().trim();
      return mapped.filter((c) => {
        const idMatches = c.id.toLowerCase().includes(s);
        const nameMatches = c.fullName.toLowerCase().includes(s);
        const phoneMatches = c.phoneNumber ? c.phoneNumber.toLowerCase().includes(s) : false;
        return idMatches || nameMatches || phoneMatches;
      });
    }

    return mapped;
  }

  async findOne(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    // Qarzlar tarixi (soft-deleted bo'lmaganlar)
    const debts = await this.prisma.debt.findMany({
      where: { customerId: id, deletedAt: null },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // To'lovlar tarixi (soft-deleted bo'lmaganlar)
    const payments = await this.prisma.payment.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { paymentDate: 'desc' },
    });

    // Jami qarz va to'lov hisobi
    const totalDebtAmount = debts.reduce((sum, d) => {
      return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
    }, 0);
    const totalPaymentAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Umumiy operatsiyalar logini shakllantiramiz
    const history = [
      ...debts.map((d) => {
        const dAmount = d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
        return {
          id: d.id,
          type: 'DEBT',
          amount: dAmount,
          date: d.createdAt,
          comment: d.comment,
          isPaid: d.isPaid,
          dueDate: d.dueDate,
          items: d.items.map((i) => ({
            productName: i.product.name,
            quantity: Number(i.quantity),
            pricePerUnit: Number(i.pricePerUnit),
            totalPrice: Number(i.quantity) * Number(i.pricePerUnit),
          })),
        };
      }),
      ...payments.map((p) => ({
        id: p.id,
        type: 'PAYMENT',
        amount: Number(p.amount),
        date: p.paymentDate,
        comment: p.comment,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        totalDebt: totalDebtAmount - totalPaymentAmount,
        lastActivityAt: customer.lastActivityAt,
        createdAt: customer.createdAt,
      },
      history,
    };
  }

  async update(storeId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber : undefined,
      },
    });
  }

  async remove(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    const now = new Date();

    // Tranzaksiya orqali mijoz, uning qarzlari va to'lovlarini soft delete qilamiz
    // Bu dashboard statistikasiga o'chirilgan ma'lumotlar ta'sir qilmasligi uchun kerak
    await this.prisma.$transaction(async (tx) => {
      // 1. Mijozning barcha qarzlarini soft delete qilish
      await tx.debt.updateMany({
        where: { customerId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      // 2. Mijozning barcha to'lovlarini soft delete qilish
      await tx.payment.updateMany({
        where: { customerId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      // 3. Mijozning o'zini soft delete qilish
      await tx.customer.update({
        where: { id },
        data: { deletedAt: now },
      });
    });

    return { success: true, message: 'Mijoz muvaffaqiyatli oʻchirildi' };
  }
}
