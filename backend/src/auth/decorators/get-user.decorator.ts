import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class UserSession {
  userId: string;
  storeId: string;
  phoneNumber: string;
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
