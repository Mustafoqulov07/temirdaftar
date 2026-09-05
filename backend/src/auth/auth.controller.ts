import { Body, Controller, Post, Get, Patch, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser, UserSession } from './decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  loginTelegram(@Body('initData') initData: string) {
    return this.authService.loginTelegram(initData);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@GetUser() session: UserSession) {
    return this.authService.getProfile(session.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @GetUser() session: UserSession,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(session.userId, dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body('phoneNumber') phoneNumber: string) {
    return this.authService.forgotPassword(phoneNumber);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body('phoneNumber') phoneNumber: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(phoneNumber, code, newPassword);
  }
}

