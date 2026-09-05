import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HTTP Security Headers (XSS, Clickjacking, MIME-sniffing himoyasi)
  app.use(helmet());

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS yoqish (React bilan bog'lanish uchun)
  app.enableCors();

  // Global prefix '/api', root '/' ni exclude qilamiz
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
