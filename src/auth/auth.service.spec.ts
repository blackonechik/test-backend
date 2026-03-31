import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../users/accounts.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  formatRefreshToken,
  hashRefreshToken,
  newRefreshSecret,
} from './refresh-token.util';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'create'>>;
  let accounts: jest.Mocked<
    Pick<
      AccountsService,
      | 'findByEmail'
      | 'createForUser'
      | 'findById'
      | 'findByUserId'
      | 'updateRefreshToken'
      | 'replaceRefreshTokenIfStoredHashMatches'
    >
  >;
  let jwt: jest.Mocked<Pick<JwtService, 'sign'>>;
  let config: jest.Mocked<Pick<ConfigService, 'get' | 'getOrThrow'>>;

  const userId = '650e8400-e29b-41d4-a716-446655440001';
  const accountId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    users = {
      create: jest.fn().mockResolvedValue({ id: userId } as never),
    };
    accounts = {
      findByEmail: jest.fn(),
      createForUser: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
      replaceRefreshTokenIfStoredHashMatches: jest
        .fn()
        .mockResolvedValue(false),
    };
    jwt = {
      sign: jest.fn().mockReturnValue('access-jwt'),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === 'REFRESH_TOKEN_PEPPER') return undefined;
        if (key === 'JWT_REFRESH_EXPIRES_DAYS') return '30';
        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'jwt-secret-pepper-fallback';
        throw new Error(`unexpected ${key}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: AccountsService, useValue: accounts },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('register: дубль email', async () => {
    accounts.findByEmail.mockResolvedValueOnce({
      id: accountId,
      userId,
      email: 'a@b.com',
      passwordHash: 'h',
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      createdAt: new Date(),
    } as never);

    await expect(
      service.register('a@b.com', 'password1'),
    ).rejects.toThrow(ConflictException);
  });

  it('login: неверный пароль', async () => {
    accounts.findByEmail.mockResolvedValueOnce({
      id: accountId,
      userId,
      email: 'a@b.com',
      passwordHash: '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      createdAt: new Date(),
    } as never);

    await expect(service.login('a@b.com', 'wrong-pass')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('refresh', () => {
    const pepper = 'jwt-secret-pepper-fallback';
    let refreshToken: string;
    let storedHash: string;

    beforeEach(() => {
      const secret = newRefreshSecret();
      refreshToken = formatRefreshToken(accountId, secret);
      storedHash = hashRefreshToken(refreshToken, pepper);
      const expires = new Date(Date.now() + 86_400_000);
      accounts.findById.mockImplementation(async () => ({
        id: accountId,
        userId,
        email: 'u@x.com',
        passwordHash: 'x',
        refreshTokenHash: storedHash,
        refreshTokenExpiresAt: expires,
        createdAt: new Date(),
      } as never));
      accounts.replaceRefreshTokenIfStoredHashMatches.mockImplementation(
        async (_id, oldH, newH) => {
          if (oldH === storedHash) {
            storedHash = newH;
            return true;
          }
          return false;
        },
      );
    });

    it('меняет хэш и отдаёт новую пару', async () => {
      const first = await service.refresh(refreshToken);
      expect(first.accessToken).toBe('access-jwt');
      expect(first.refreshToken).not.toBe(refreshToken);
      expect(
        accounts.replaceRefreshTokenIfStoredHashMatches,
      ).toHaveBeenCalled();
      const call =
        accounts.replaceRefreshTokenIfStoredHashMatches.mock.calls[0];
      const newHash = call[2] as string;
      expect(newHash).not.toBe(hashRefreshToken(refreshToken, pepper));
      expect(newHash).toBe(storedHash);
    });

    it('тот же refresh второй раз не канает', async () => {
      const first = await service.refresh(refreshToken);
      expect(first.refreshToken).toBeDefined();

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('мусорный токен', async () => {
      await expect(service.refresh('not-a-valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('update в БД не затронул строку', async () => {
      accounts.replaceRefreshTokenIfStoredHashMatches.mockResolvedValueOnce(
        false,
      );
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('logout чистит refresh', async () => {
    accounts.findByUserId.mockResolvedValueOnce({
      id: accountId,
      userId,
      email: 'a@b.com',
      passwordHash: 'h',
      refreshTokenHash: 'x',
      refreshTokenExpiresAt: new Date(),
      createdAt: new Date(),
    } as never);

    await service.logout(userId);

    expect(accounts.updateRefreshToken).toHaveBeenCalledWith(
      accountId,
      null,
      null,
    );
  });
});
