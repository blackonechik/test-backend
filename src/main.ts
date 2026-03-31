import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin?.trim()) {
    const origins = corsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    app.enableCors({ origin: origins, credentials: true });
  } else {
    app.enableCors({ origin: true, credentials: true });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Articles API')
    .setDescription(
      'Статьи + JWT. Access в ответе, refresh в httpOnly cookie. Документация по запуску — README.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer из login/register',
      },
      'access-token',
    )
    .addCookieAuth('refresh-cookie', {
      type: 'apiKey',
      in: 'cookie',
      name: configService.get<string>('REFRESH_COOKIE_NAME') ?? 'refresh_token',
      description: 'refresh cookie',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
}
bootstrap();
