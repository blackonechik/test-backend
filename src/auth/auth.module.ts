import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshCookieHelper } from './refresh-cookie.helper';
import { RefreshController } from './refresh.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            config.get<string>('JWT_EXPIRES_IN') ??
            '15m') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController, RefreshController],
  providers: [AuthService, RefreshCookieHelper, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
