import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, UserSession } from '../auth/decorators/get-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(@GetUser() session: UserSession, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(session.storeId, dto);
  }

  @Get()
  findAll(@GetUser() session: UserSession, @Query('search') search?: string) {
    return this.customersService.findAll(session.storeId, search);
  }

  @Get(':id')
  findOne(@GetUser() session: UserSession, @Param('id') id: string) {
    return this.customersService.findOne(session.storeId, id);
  }

  @Put(':id')
  update(
    @GetUser() session: UserSession,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(session.storeId, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() session: UserSession, @Param('id') id: string) {
    return this.customersService.remove(session.storeId, id);
  }
}
