import { Controller, Get, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, UserSession } from '../auth/decorators/get-user.decorator';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get('dashboard')
  getDashboard(@GetUser() session: UserSession) {
    return this.storesService.getDashboardData(session.storeId);
  }
}
