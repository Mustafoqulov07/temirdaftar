import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;

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

    // /resetpassword komandasi (Parolni tiklash/o'zgartirish)
    this.bot.command('resetpassword', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const text = ctx.message.text || '';
      const args = text.split(/\s+/);
      
      if (args.length < 2) {
        return ctx.reply('⚠️ Iltimos, yangi parolni ham yuboring.\n\nMisol uchun:\n`/resetpassword yangi_parol_shu_yerda`', { parse_mode: 'Markdown' });
      }

      const newPassword = args[1];
      if (newPassword.length < 6) {
        return ctx.reply('⚠️ Parol uzunligi kamida 6 ta belgidan iborat boʻlishi kerak.');
      }

      try {
        const user = await this.prisma.user.findUnique({
          where: { telegramId },
        });

        if (!user) {
          return ctx.reply('Avval ro‘yxatdan o‘ting. Buning uchun /start buyrug‘ini bering.');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });

        await ctx.reply('✅ Bajarildi! Yangi parolingiz muvaffaqiyatli saqlandi. Endi brauzer orqali kirganingizda shu yangi parolni ishlatishingiz mumkin.');
      } catch (error) {
        console.error('Parolni yangilashda xatolik:', error);
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
        select: { totalDebt: true },
      });

      const totalDebt = customers.reduce((sum, customer) => sum + Number(customer.totalDebt), 0);

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
