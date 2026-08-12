import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (process.env['JWT_SECRET'] || process.env['JWT_SECRET '] || 'qarzdor-secret-key-123').trim(),
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.storeId) {
      throw new UnauthorizedException('Yaroqsiz token');
    }
    return {
      userId: payload.sub,
      storeId: payload.storeId,
      phoneNumber: payload.phoneNumber,
    };
  }
}
