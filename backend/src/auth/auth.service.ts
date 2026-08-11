import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('Bu telefon raqam orqali allaqachon roʻyxatdan oʻtilgan');
    }

    if (dto.telegramId) {
      const existingTelegram = await this.prisma.user.findUnique({
        where: { telegramId: dto.telegramId },
      });
      if (existingTelegram) {
        throw new ConflictException('Ushbu Telegram hisobi allaqachon boshqa profilga bogʻlangan');
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : await bcrypt.hash(Math.random().toString(36).substring(2), 10);

    // Baza butunligi uchun tranzaksiyadan foydalanamiz
    const { user, store } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phoneNumber: dto.phoneNumber,
          fullName: dto.fullName,
          passwordHash,
          telegramId: dto.telegramId || null,
        },
      });

      const newStore = await tx.store.create({
        data: {
          name: dto.storeName,
          userId: newUser.id,
        },
      });

      return { user: newUser, store: newStore };
    });

    const token = this.jwtService.sign({
      sub: user.id,
      storeId: store.id,
      phoneNumber: user.phoneNumber,
    });

    return {
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
      },
      store: {
        id: store.id,
        name: store.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
      include: { store: true },
    });

    if (!user || !user.store) {
      throw new UnauthorizedException('Telefon raqam yoki parol notoʻgʻri');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Telefon raqam yoki parol notoʻgʻri');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      storeId: user.store.id,
      phoneNumber: user.phoneNumber,
    });

    return {
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
      },
      store: {
        id: user.store.id,
        name: user.store.name,
      },
    };
  }

  verifyTelegramInitData(initDataString: string): { id: string; fullName: string } | null {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      // Agar token o'rnatilmagan bo'lsa, xatolik beramiz yoki log qilamiz
      console.warn('TELEGRAM_BOT_TOKEN .env faylida sozlanmagan');
      return null;
    }

    try {
      const params = new URLSearchParams(initDataString);
      const hash = params.get('hash');
      if (!hash) return null;

      params.delete('hash');
      const keys = Array.from(params.keys()).sort();
      const dataCheckString = keys
        .map((key) => `${key}=${params.get(key)}`)
        .join('\n');

      const secretKey = createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const generatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (generatedHash !== hash) {
        return null;
      }

      const userParam = params.get('user');
      if (!userParam) return null;

      const telegramUser = JSON.parse(userParam);
      const fullName = [telegramUser.first_name, telegramUser.last_name]
        .filter(Boolean)
        .join(' ');

      return {
        id: telegramUser.id.toString(),
        fullName: fullName || telegramUser.username || 'Foydalanuvchi',
      };
    } catch (e) {
      console.error('Telegram initData verifikatsiyasida xatolik:', e);
      return null;
    }
  }

  async loginTelegram(initData: string) {
    const telegramUser = this.verifyTelegramInitData(initData);
    if (!telegramUser) {
      throw new UnauthorizedException('Telegram maʼlumotlari haqiqiy emas yoki muddati oʻtgan');
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramId: telegramUser.id },
      include: { store: true },
    });

    if (!user || !user.store) {
      return {
        isNew: true,
        telegramId: telegramUser.id,
        fullName: telegramUser.fullName,
      };
    }

    const token = this.jwtService.sign({
      sub: user.id,
      storeId: user.store.id,
      phoneNumber: user.phoneNumber,
    });

    return {
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
      },
      store: {
        id: user.store.id,
        name: user.store.name,
      },
    };
  }
}
