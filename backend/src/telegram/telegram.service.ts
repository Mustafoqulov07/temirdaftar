import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;
  private userStates = new Map<string, string>();

  constructor(private prisma: PrismaService) {
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env['TELEGRAM_BOT_TOKEN '];
    if (!token) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN .env faylida koʻrsatilmagan. Telegram bot ishga tushmaydi.');
      return;
    }
    this.bot = new Telegraf(token.trim());
    this.setupBot();
  }

  async onModuleInit() {
    if (this.bot) {
      // Fonda ishga tushiramiz, NestJS ishga tushishini bloklamaslik uchun
      this.bot.launch().catch((err) => {
        console.error('Telegram botni ishga tushirishda xatolik:', err);
      });

      // 1. Oddiy foydalanuvchilar uchun umumiy buyruqlar
      this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Tizimni ishga tushirish va menyuni koʻrish' },
        { command: 'resetpassword', description: 'Parolni yangilash. (Foydalanish: /resetpassword yangi_parol)' },
      ]).catch((err) => {
        console.error('Telegram buyruqlarini roʻyxatdan oʻtkazishda xatolik:', err);
      });

      // 2. Agar ADMIN_TELEGRAM_ID bo'lsa, faqat shu foydalanuvchi uchun /magazine buyrug'ini ro'yxatdan o'tkazamiz
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId) {
        this.bot.telegram.setMyCommands([
          { command: 'start', description: 'Tizimni ishga tushirish va menyuni koʻrish' },
          { command: 'resetpassword', description: 'Parolni yangilash. (Foydalanish: /resetpassword)' },
          { command: 'magazine', description: 'Tizim statistikasi (Admin)' },
        ], {
          scope: { type: 'chat', chat_id: Number(adminId) }
        }).catch((err) => {
          console.error('Admin buyruqlarini roʻyxatdan oʻtkazishda xatolik:', err);
        });
      }

      console.log('🤖 Telegram bot muvaffaqiyatli ishga tushdi (Polling).');
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGINT');
    }
  }

  private setupBot() {
    // /start komandasi
    this.bot.command('start', async (ctx) => {
      const telegramId = ctx.from.id.toString();

      const user = await this.prisma.user.findUnique({
        where: { telegramId },
        include: { store: true },
      });

      if (user && user.store) {
        await ctx.reply(
          `Qayta ko'rishdan xursandmiz, ${user.fullName}!\n\nSizning do'koningiz: *${user.store.name}*\n\nQuyidagi tugmalar orqali tizimdan foydalanishingiz mumkin:`,
          {
            parse_mode: 'Markdown',
            ...this.getMainMenuKeyboard(),
          }
        );
      } else {
        await ctx.reply(
          `Assalomu alaykum! "Temir Daftar" — Raqamli Qarz Daftari ilovasining rasmiy botiga xush kelibsiz.\n\nTizimdan foydalanish uchun, iltimos, telefon raqamingizni yuborib roʻyxatdan oʻting yoki hisobingizni bogʻlang:`,
          Markup.keyboard([
            [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
          ]).resize()
        );
      }
    });

    // /resetpassword komandasi (Parolni tiklash/o'zgartirish boshlash)
    this.bot.command('resetpassword', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      
      try {
        const user = await this.prisma.user.findUnique({
          where: { telegramId },
        });

        if (!user) {
          return ctx.reply('Avval ro‘yxatdan o‘ting. Buning uchun /start buyrug‘ini bering.');
        }

        this.userStates.set(telegramId, 'WAITING_FOR_NEW_PASSWORD');
        await ctx.reply('🔐 Iltimos, yangi parolingizni kiriting (kamida 6 ta belgidan iborat boʻlsin):');
      } catch (error) {
        console.error('Parol oʻzgartirishni boshlashda xatolik:', error);
        await ctx.reply('Xatolik yuz berdi. Iltimos, keyinroq qayta urunib koʻring.');
      }
    });

    // /magazine komandasi (Faqat admin uchun maxfiy statistika)
    this.bot.command('magazine', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const adminId = process.env.ADMIN_TELEGRAM_ID;

      // Agar ADMIN_TELEGRAM_ID env faylda sozlangan bo'lsa va mos kelmasa, javob bermaymiz (maxfiylik uchun)
      if (adminId && telegramId !== adminId) {
        return;
      }

      try {
        const [
          usersCount,
          telegramUsersCount,
          storesCount,
          customersCount,
          debtsCount,
          paymentsCount,
          paymentsSum,
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
        ]);

        const debtItems = await this.prisma.debtItem.findMany({
          where: { debt: { deletedAt: null } },
        });
        const totalDebtsSum = debtItems.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.pricePerUnit),
          0,
        );

        const formattedDebt = new Intl.NumberFormat('uz-UZ').format(totalDebtsSum);
        const formattedPayment = new Intl.NumberFormat('uz-UZ').format(Number(paymentsSum._sum.amount || 0));

        let responseText = `📊 *Tizim statistikasi (Admin):*\n\n` +
          `👥 *Jami foydalanuvchilar:* ${usersCount} ta\n` +
          `🤖 *Telegram ulovchilar:* ${telegramUsersCount} ta\n` +
          `🏪 *Jami do'konlar:* ${storesCount} ta\n` +
          `👥 *Jami mijozlar:* ${customersCount} ta\n\n` +
          `💰 *Jami qarzlar:* ${formattedDebt} so'm (${debtsCount} ta tranzaksiya)\n` +
          `💵 *Jami to'lovlar:* ${formattedPayment} so'm (${paymentsCount} ta tranzaksiya)\n\n` +
          `Your Telegram ID: \`${telegramId}\``;

        if (!adminId) {
          responseText += `\n\n⚠️ *Eslatma:* Ushbu ma'lumotlarni faqat o'zingiz ko'rishingiz uchun Render panelida \`ADMIN_TELEGRAM_ID\` muhit o'zgaruvchisiga \`${telegramId}\` qiymatini o'rnating.`;
        }

        await ctx.reply(responseText, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Admin statistikasini olishda xatolik:', error);
        await ctx.reply('Xatolik yuz berdi. Iltimos, keyinroq qayta urunib koʻring.');
      }
    });

    // Kontak yuborilganda
    this.bot.on('contact', async (ctx) => {
      try {
        const contact = ctx.message.contact;
        const telegramId = ctx.from.id.toString();

        // Kontakt foydalanuvchining o'ziga tegishli ekanligini tekshiramiz
        if (contact.user_id !== ctx.from.id) {
          return ctx.reply('⚠️ Iltimos, faqat oʻzingizning telefon raqamingizni yuboring.');
        }

        // Telefon raqamni formatlash (masalan, +998901234567)
        let phoneNumber = contact.phone_number;
        if (!phoneNumber.startsWith('+')) {
          phoneNumber = '+' + phoneNumber;
        }

        // Telefoni bo'yicha bazada qidirish
        const existingUser = await this.prisma.user.findUnique({
          where: { phoneNumber },
          include: { store: true },
        });

        if (existingUser) {
          // Foydalanuvchi bor, lekin telegramId hali ulanmagan
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { telegramId },
          });

          await ctx.reply(
            `Tabriklaymiz! Sizning Telegram hisobingiz "${existingUser.fullName}" profiliga muvaffaqiyatli bog'landi. 🎉`,
            this.getMainMenuKeyboard()
          );
        } else {
          // Yangi foydalanuvchi yaratamiz
          const fullName = [contact.first_name, contact.last_name]
            .filter(Boolean)
            .join(' ') || 'Foydalanuvchi';
          
          const passwordHash = await bcrypt.hash(Math.random().toString(36).substring(2), 10);

          await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                phoneNumber,
                fullName,
                passwordHash,
                telegramId,
              },
            });

            await tx.store.create({
              data: {
                name: `${fullName} do'koni`,
                userId: newUser.id,
              },
            });
          });

          await ctx.reply(
            `Ro'yxatdan muvaffaqiyatli o'tdingiz va siz uchun yangi do'kon yaratildi! 🚀\n\nEndi quyidagi tugma orqali qarz daftaringizni ochishingiz mumkin.`,
            this.getMainMenuKeyboard()
          );
        }
      } catch (error) {
        console.error('Kontaktni qayta ishlashda xatolik:', error);
        await ctx.reply('Xatolik yuz berdi. Iltimos, keyinroq qayta urunib koʻring.');
      }
    });

    // Statistika tugmasi bosilganda
    this.bot.hears('📊 Statistika', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const user = await this.prisma.user.findUnique({
        where: { telegramId },
        include: { store: true },
      });

      if (!user || !user.store) {
        return ctx.reply('Avval ro‘yxatdan o‘ting. Buning uchun /start buyrug‘ini bering.');
      }

      // Mijozlar va ularning umumiy qarzini hisoblaymiz
      const customersCount = await this.prisma.customer.count({
        where: { storeId: user.store.id, deletedAt: null },
      });

      const customers = await this.prisma.customer.findMany({
        where: { storeId: user.store.id, deletedAt: null },
        include: {
          debts: {
            where: { deletedAt: null },
            include: { items: true },
          },
          payments: {
            where: { deletedAt: null },
          },
        },
      });

      const totalDebt = customers.reduce((sum, c) => {
        const totalDebtAmount = c.debts.reduce((sum, d) => {
          return sum + d.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.pricePerUnit), 0);
        }, 0);
        const totalPaymentAmount = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return sum + (totalDebtAmount - totalPaymentAmount);
      }, 0);

      const formattedDebt = new Intl.NumberFormat('uz-UZ').format(totalDebt);

      await ctx.reply(
        `📊 *Sizning do'koningiz statistikasi:*\n\n` +
        `🏪 *Do'kon:* ${user.store.name}\n` +
        `👥 *Mijozlar soni:* ${customersCount} nafar\n` +
        `💰 *Umumiy qarz miqdori:* ${formattedDebt} so'm`,
        { parse_mode: 'Markdown' }
      );
    });

    // Profil tugmasi bosilganda
    this.bot.hears('👤 Profil', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const user = await this.prisma.user.findUnique({
        where: { telegramId },
        include: { store: true },
      });

      if (!user || !user.store) {
        return ctx.reply('Avval ro‘yxatdan o‘ting. Buning uchun /start buyrug‘ini bering.');
      }

      await ctx.reply(
        `👤 *Sizning profilingiz:*\n\n` +
        `📝 *Ism:* ${user.fullName}\n` +
        `📞 *Telefon:* ${user.phoneNumber}\n` +
        `🏪 *Do'kon:* ${user.store.name}\n` +
        `🆔 *Telegram ID:* \`${user.telegramId}\``,
        { parse_mode: 'Markdown' }
      );
    });

    // Har qanday boshqa matnli xabarlar uchun
    this.bot.on('text', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const text = ctx.message.text ? ctx.message.text.trim() : '';

      // Agar parol kiritish holatida bo'lsa
      if (this.userStates.get(telegramId) === 'WAITING_FOR_NEW_PASSWORD') {
        if (text.length < 6) {
          return ctx.reply('⚠️ Parol uzunligi kamida 6 ta belgidan iborat boʻlishi kerak. Iltimos, qaytadan yozing:');
        }

        try {
          const user = await this.prisma.user.findUnique({
            where: { telegramId },
          });

          if (!user) {
            this.userStates.delete(telegramId);
            return ctx.reply('Foydalanuvchi topilmadi.');
          }

          const passwordHash = await bcrypt.hash(text, 10);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
          });

          this.userStates.delete(telegramId);
          await ctx.reply(
            '✅ Bajarildi! Yangi parolingiz muvaffaqiyatli saqlandi. Endi brauzer orqali kirganingizda shu yangi parolni ishlatishingiz mumkin.',
            this.getMainMenuKeyboard()
          );
        } catch (error) {
          console.error('Parolni yangilashda xatolik:', error);
          await ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib koʻring.');
        }
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { telegramId },
      });

      if (user) {
        await ctx.reply(
          'Quyidagi menyu tugmalaridan foydalaning yoki Mini Appni oching:',
          this.getMainMenuKeyboard()
        );
      } else {
        await ctx.reply(
          'Iltimos, avval telefon raqamingizni yuborib roʻyxatdan oʻting.',
          Markup.keyboard([
            [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
          ]).resize()
        );
      }
    });
  }

  private getMainMenuKeyboard() {
    const webAppUrl = process.env.TELEGRAM_MINI_APP_URL || 'https://temirdaftar.pages.dev';
    
    return Markup.keyboard([
      [Markup.button.webApp('🌐 Mini Appni ochish', webAppUrl)],
      ['📊 Statistika', '👤 Profil'],
    ]).resize();
  }
}
