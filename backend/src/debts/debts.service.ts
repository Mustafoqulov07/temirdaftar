import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto } from './dto/create-debt.dto';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateDebtDto) {
    // Mijoz ushbu do'konga tegishli ekanligini tekshiramiz (xavfsizlik uchun)
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, storeId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Mijoz topilmadi');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Yangi qarz obyektini yaratamiz
      const newDebt = await tx.debt.create({
        data: {
          customerId: dto.customerId,
          dueDate: new Date(dto.dueDate),
          comment: dto.comment || null,
        },
      });

      // 2. Har bir mahsulot uchun Product qidiramiz/yaratamiz va DebtItem hosil qilamiz
      const debtItems: any[] = [];
      for (const item of dto.items) {
        let product = await tx.product.findFirst({
          where: {
            storeId,
            name: { equals: item.productName, mode: 'insensitive' },
          },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              storeId,
              name: item.productName,
              price: item.pricePerUnit,
            },
          });
        }

        const debtItem = await tx.debtItem.create({
          data: {
            debtId: newDebt.id,
            productId: product.id,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
          },
          include: {
            product: true,
          },
        });

        debtItems.push(debtItem);
      }

      // 3. Oxirgi faollik vaqtini yangilaymiz
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          lastActivityAt: new Date(),
        },
      });

      // API javobi uchun kutilgan formatda qaytaramiz
      const totalAmount = debtItems.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
        0,
      );

      return {
        ...newDebt,
        totalAmount,
        items: debtItems.map((item) => ({
          id: item.id,
          debtId: item.debtId,
          productId: item.productId,
          productName: item.product.name,
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
          totalPrice: Number(item.quantity) * Number(item.pricePerUnit),
          createdAt: item.createdAt,
        })),
      };
    });
  }
}
