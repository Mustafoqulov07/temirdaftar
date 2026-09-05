import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const isSsl = connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('sslmode=prefer') || connectionString.includes('neon.tech'));

    const pool = new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();

    // Assign serialId to any existing customers who don't have one
    try {
      const customersWithoutSerial = await this.customer.findMany({
        where: { serialId: null },
        orderBy: { createdAt: 'asc' },
      });

      if (customersWithoutSerial.length > 0) {
        console.log(`Found ${customersWithoutSerial.length} customers without serialId. Assigning sequential numbers...`);
        const storeGroups: { [storeId: string]: any[] } = {};
        for (const customer of customersWithoutSerial) {
          if (!storeGroups[customer.storeId]) {
            storeGroups[customer.storeId] = [];
          }
          storeGroups[customer.storeId].push(customer);
        }

        for (const storeId of Object.keys(storeGroups)) {
          const maxCustomer = await this.customer.findFirst({
            where: { storeId, NOT: { serialId: null } },
            orderBy: { serialId: 'desc' },
            select: { serialId: true },
          });

          let nextSerialId = (maxCustomer?.serialId || 0) + 1;
          for (const customer of storeGroups[storeId]) {
            await this.customer.update({
              where: { id: customer.id },
              data: { serialId: nextSerialId++ },
            });
          }
        }
        console.log('Successfully assigned serialIds to all customers.');
      }
    } catch (err) {
      console.error('Error assigning serialIds on startup:', err);
    }

    // Ensure Super Admin role is assigned
    try {
      const adminPhone = '+998937145515';
      const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
      const conditions: any[] = [{ phoneNumber: adminPhone }];
      if (adminTelegramId) {
        conditions.push({ telegramId: adminTelegramId });
      }

      await this.user.updateMany({
        where: {
          OR: conditions,
          role: { not: 'SUPER_ADMIN' },
        },
        data: { role: 'SUPER_ADMIN' },
      });
    } catch (err) {
      console.error('Error assigning super admin role:', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
