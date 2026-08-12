import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 'ok',
      name: 'Temirdaftar API',
      version: '1.0.0',
      api: '/api',
      endpoints: {
        auth: '/api/auth',
        stores: '/api/stores',
        customers: '/api/customers',
        debts: '/api/debts',
        payments: '/api/payments',
      },
    };
  }
}
