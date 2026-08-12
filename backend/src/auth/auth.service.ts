import { ConflictException, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
    const rawBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env['TELEGRAM_BOT_TOKEN '];
    if (!rawBotToken) {
      // Agar token o'rnatilmagan bo'lsa, xatolik beramiz yoki log qilamiz
      console.warn('TELEGRAM_BOT_TOKEN .env faylida sozlanmagan');
      return null;
    }
    const botToken = rawBotToken.trim();

    try {
      const params = new URLSearchParams(initDataString);
      const hash = params.get('hash');
      if (!hash) return null;

      // Replay Attack'dan himoyalanish uchun auth_date tekshiruvi (24 soatlik limit)
      const authDate = params.get('auth_date');
      if (!authDate) return null;
      const authTimestamp = parseInt(authDate, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (currentTimestamp - authTimestamp > 86400) {
        console.warn('Telegram initData muddati oʻtgan (24 soatdan koʻp vaqt oʻtgan)');
        return null;
      }

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

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        telegramId: user.telegramId,
      },
      store: user.store ? {
        id: user.store.id,
        name: user.store.name,
        address: user.store.address,
      } : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (dto.phoneNumber) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Bu telefon raqam orqali allaqachon roʻyxatdan oʻtilgan');
      }
    }

    let telegramIdToUpdate: string | null | undefined = undefined;
    if (dto.telegramId !== undefined) {
      telegramIdToUpdate = dto.telegramId ? dto.telegramId.trim() : null;
      if (telegramIdToUpdate === '') {
        telegramIdToUpdate = null;
      }
    }

    if (telegramIdToUpdate) {
      const existingTelegram = await this.prisma.user.findUnique({
        where: { telegramId: telegramIdToUpdate },
      });
      if (existingTelegram && existingTelegram.id !== userId) {
        throw new ConflictException('Ushbu Telegram hisobi allaqachon boshqa profilga bogʻlangan');
      }
    }

    let storeAddressToUpdate: string | null | undefined = undefined;
    if (dto.storeAddress !== undefined) {
      storeAddressToUpdate = dto.storeAddress ? dto.storeAddress.trim() : null;
      if (storeAddressToUpdate === '') {
        storeAddressToUpdate = null;
      }
    }

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phoneNumber && { phoneNumber: dto.phoneNumber }),
        ...(telegramIdToUpdate !== undefined && { telegramId: telegramIdToUpdate }),
        ...(passwordHash && { passwordHash }),
        store: {
          update: {
            ...(dto.storeName && { name: dto.storeName }),
            ...(storeAddressToUpdate !== undefined && { address: storeAddressToUpdate }),
          },
        },
      },
      include: { store: true },
    });

    const token = this.jwtService.sign({
      sub: updatedUser.id,
      storeId: updatedUser.store!.id,
      phoneNumber: updatedUser.phoneNumber,
    });

    return {
      token,
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        fullName: updatedUser.fullName,
        telegramId: updatedUser.telegramId,
      },
      store: {
        id: updatedUser.store!.id,
        name: updatedUser.store!.name,
        address: updatedUser.store!.address,
      },
    };
  }
}
