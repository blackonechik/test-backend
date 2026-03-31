import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class RefreshCookieHelper {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  cookieName(): string {
    return this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'refresh_token';
  }

  private secure(): boolean {
    return (
      this.config.get<string>('COOKIE_SECURE') === 'true' ||
      process.env.NODE_ENV === 'production'
    );
  }

  private opts(maxAgeMs: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure(),
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    };
  }

  set(res: Response, refreshToken: string): void {
    res.cookie(
      this.cookieName(),
      refreshToken,
      this.opts(this.authService.refreshCookieMaxAgeMs()),
    );
  }

  clear(res: Response): void {
    const name = this.cookieName();
    res.clearCookie(name, {
      path: '/',
      httpOnly: true,
      secure: this.secure(),
      sameSite: 'lax',
    });
  }

  read(req: Request): string | undefined {
    const raw = req.cookies?.[this.cookieName()];
    return typeof raw === 'string' ? raw : undefined;
  }
}
