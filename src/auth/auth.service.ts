import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccountsService } from '../users/accounts.service';
import { UsersService } from '../users/users.service';
import {
  formatRefreshToken,
  hashRefreshToken,
  newRefreshSecret,
  parseRefreshToken,
  verifyRefreshTokenHash,
} from './refresh-token.util';
import { AccessTokenPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 10;

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private refreshPepper(): string {
    return (
      this.config.get<string>('REFRESH_TOKEN_PEPPER') ??
      this.config.getOrThrow<string>('JWT_SECRET')
    );
  }

  private refreshTtlMs(): number {
    const days = parseInt(
      this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS') ?? '30',
      10,
    );
    if (!Number.isFinite(days) || days < 1) {
      return 30 * 86_400_000;
    }
    return days * 86_400_000;
  }

  refreshCookieMaxAgeMs(): number {
    return this.refreshTtlMs();
  }

  async register(email: string, password: string): Promise<AuthTokensResponse> {
    const existing = await this.accountsService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.usersService.create();
    const account = await this.accountsService.createForUser(
      user.id,
      email,
      passwordHash,
    );
    return this.issueTokenPair(account.id, user.id, account.email);
  }

  async login(email: string, password: string): Promise<AuthTokensResponse> {
    const account = await this.accountsService.findByEmail(email);
    if (!account) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const ok = await bcrypt.compare(password, account.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    return this.issueTokenPair(account.id, account.userId, account.email);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const parsed = parseRefreshToken(refreshToken.trim());
    if (!parsed) {
      throw new UnauthorizedException('Неверный refresh-токен');
    }
    const account = await this.accountsService.findById(parsed.accountId);
    if (
      !account ||
      account.refreshTokenHash == null ||
      account.refreshTokenExpiresAt == null
    ) {
      throw new UnauthorizedException('Сессия недействительна');
    }
    if (account.refreshTokenExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Сессия истекла');
    }
    const pepper = this.refreshPepper();
    const storedHash = account.refreshTokenHash;
    if (!verifyRefreshTokenHash(refreshToken, storedHash, pepper)) {
      throw new UnauthorizedException('Неверный refresh-токен');
    }
    const payload: AccessTokenPayload = {
      sub: account.userId,
      email: account.email,
    };
    const accessToken = this.jwtService.sign(payload);
    const secret = newRefreshSecret();
    const newRefreshToken = formatRefreshToken(account.id, secret);
    const newHash = hashRefreshToken(newRefreshToken, pepper);
    const refreshTokenExpiresAt = new Date(Date.now() + this.refreshTtlMs());
    const swapped =
      await this.accountsService.replaceRefreshTokenIfStoredHashMatches(
        account.id,
        storedHash,
        newHash,
        refreshTokenExpiresAt,
      );
    if (!swapped) {
      throw new UnauthorizedException(
        'Не удалось обновить сессию; повторите вход',
      );
    }
    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
    };
  }

  async logout(userId: string): Promise<void> {
    const account = await this.accountsService.findByUserId(userId);
    if (!account) {
      return;
    }
    await this.accountsService.updateRefreshToken(account.id, null, null);
  }

  private async issueTokenPair(
    accountId: string,
    userId: string,
    email: string,
  ): Promise<AuthTokensResponse> {
    const payload: AccessTokenPayload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload);
    const secret = newRefreshSecret();
    const refreshToken = formatRefreshToken(accountId, secret);
    const pepper = this.refreshPepper();
    const refreshTokenHash = hashRefreshToken(refreshToken, pepper);
    const refreshTokenExpiresAt = new Date(Date.now() + this.refreshTtlMs());
    await this.accountsService.updateRefreshToken(
      accountId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }
}
