import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, UserSession } from '../auth/decorators/get-user.decorator';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private debtsService: DebtsService) {}

  @Post()
  create(@GetUser() session: UserSession, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(session.storeId, dto);
  }
}
