import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  console.log("DEBUG ENV KEYS:", Object.keys(process.env));
  console.log("DEBUG TELEGRAM_BOT_TOKEN PRESENT:", !!process.env.TELEGRAM_BOT_TOKEN);
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log("DEBUG TELEGRAM_BOT_TOKEN LENGTH:", process.env.TELEGRAM_BOT_TOKEN.length);
  }
  const app = await NestFactory.create(AppModule);

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

  // Global prefix '/api'
  app.setGlobalPrefix('api');

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
