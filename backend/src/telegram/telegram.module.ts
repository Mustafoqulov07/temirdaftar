import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [PrismaModule, forwardRef(() => OtpModule)],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
