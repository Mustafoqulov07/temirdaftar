import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    PassportModule,
    TelegramModule,
    JwtModule.register({
      secret: (process.env['JWT_SECRET'] || process.env['JWT_SECRET '] || 'qarzdor-secret-key-123').trim(),
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
