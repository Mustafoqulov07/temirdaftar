import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

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

    // Ensure strictly ONE Super Admin exists, synced with Render environment variables (SUPER_ADMIN_PHONE, SUPER_ADMIN_PASSWORD)
    try {
      let targetPhone = (
        process.env.SUPER_ADMIN_PHONE ||
        process.env['SUPER_ADMIN_PHONE '] ||
        process.env.ADMIN_PHONE ||
        '+998937145515'
      ).trim();

      if (!targetPhone.startsWith('+')) {
        targetPhone = '+' + targetPhone;
      }

      const targetPassword = (
        process.env.SUPER_ADMIN_PASSWORD ||
        process.env['SUPER_ADMIN_PASSWORD '] ||
        process.env.ADMIN_PASSWORD
      )?.trim();

      const adminTelegramId = process.env.ADMIN_TELEGRAM_ID
        ? process.env.ADMIN_TELEGRAM_ID.trim()
        : null;

      console.log(`[SuperAdmin Init] Syncing single Super Admin. Target phone: ${targetPhone}`);

      // 1. Find if there is any user currently having role = 'SUPER_ADMIN'
      const existingSuperAdmin = await this.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });

      // 2. Find user with targetPhone
      const userWithTargetPhone = await this.user.findUnique({
        where: { phoneNumber: targetPhone },
      });

      let designatedAdminId: string;

      if (userWithTargetPhone) {
        designatedAdminId = userWithTargetPhone.id;
        const updateData: any = { role: 'SUPER_ADMIN', isBlocked: false };
        if (targetPassword) {
          updateData.passwordHash = await bcrypt.hash(targetPassword, 10);
        }
        if (adminTelegramId && !userWithTargetPhone.telegramId) {
          updateData.telegramId = adminTelegramId;
        }
        await this.user.update({
          where: { id: userWithTargetPhone.id },
          data: updateData,
        });
        console.log(`[SuperAdmin Init] User with phone ${targetPhone} verified as the sole SUPER_ADMIN.`);
      } else if (existingSuperAdmin) {
        // Phone changed in environment variables! Update existing super admin to the new phone number
        designatedAdminId = existingSuperAdmin.id;
        const updateData: any = { phoneNumber: targetPhone, isBlocked: false };
        if (targetPassword) {
          updateData.passwordHash = await bcrypt.hash(targetPassword, 10);
        }
        if (adminTelegramId) {
          updateData.telegramId = adminTelegramId;
        }
        await this.user.update({
          where: { id: existingSuperAdmin.id },
          data: updateData,
        });
        console.log(`[SuperAdmin Init] Updated existing SUPER_ADMIN phone number from ${existingSuperAdmin.phoneNumber} to ${targetPhone}.`);
      } else {
        // No super admin exists and userWithTargetPhone does not exist -> Create fresh Super Admin
        const defaultPassword = targetPassword || 'Admin123!';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const newAdmin = await this.user.create({
          data: {
            phoneNumber: targetPhone,
            fullName: 'Super Admin',
            role: 'SUPER_ADMIN',
            passwordHash,
            isBlocked: false,
            telegramId: adminTelegramId || undefined,
          },
        });
        designatedAdminId = newAdmin.id;
        console.log(`[SuperAdmin Init] Created new dedicated SUPER_ADMIN user with phone ${targetPhone}.`);
      }

      // 3. Strictly enforce ONLY ONE Super Admin: Demote any other users who have role = 'SUPER_ADMIN'
      const demoted = await this.user.updateMany({
        where: {
          role: 'SUPER_ADMIN',
          id: { not: designatedAdminId },
        },
        data: { role: 'USER' },
      });
      if (demoted.count > 0) {
        console.log(`[SuperAdmin Init] Demoted ${demoted.count} other user(s) to USER. Single Super Admin enforced.`);
      }
    } catch (err) {
      console.error('[SuperAdmin Init] Error configuring super admin:', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
