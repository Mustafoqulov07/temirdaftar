import { Body, Controller, Post, Get, Patch, HttpCode, HttpStatus, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.json({
      user: result.user,
      store: result.store,
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.json({
      user: result.user,
      store: result.store,
    });
  }

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async loginTelegram(@Body('initData') initData: string, @Res() res: Response) {
    const result: any = await this.authService.loginTelegram(initData);
    if (result.isNew) {
      return res.json(result);
    }
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.json({
      user: result.user,
      store: result.store,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body('refreshToken') refreshToken: string, @Res() res: Response) {
    const result = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.json({
      user: result.user,
      store: result.store,
    });
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res() res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Sessiya tugadi' });
  }
}
