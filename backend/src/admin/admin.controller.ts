import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getGlobalStats();
  }

  @Get('stores')
  getStores(@Query('search') search?: string) {
    return this.adminService.getAllStores(search);
  }

  @Get('stores/:id')
  getStoreDetails(@Param('id') id: string) {
    return this.adminService.getStoreDetails(id);
  }

  @Patch('stores/:id/toggle-block')
  toggleStoreBlock(@Param('id') id: string) {
    return this.adminService.toggleStoreBlock(id);
  }

  @Post('stores/:id/reset-password')
  resetStorePassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminService.resetStorePassword(id, newPassword);
  }

  @Post('broadcast')
  broadcast(@Body('message') message: string) {
    return this.adminService.broadcastMessage(message);
  }
}
