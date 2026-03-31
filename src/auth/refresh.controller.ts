import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RefreshCookieHelper } from './refresh-cookie.helper';

@ApiTags('auth')
@Controller()
export class RefreshController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshCookie: RefreshCookieHelper,
  ) {}

  @Post('refresh')
  @ApiCookieAuth('refresh-cookie')
  @ApiOperation({ summary: 'refresh (как /auth/refresh)' })
  @ApiOkResponse({ description: 'access + cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.refreshCookie.read(req);
    if (!raw?.trim()) {
      throw new UnauthorizedException('Нет refresh-сессии');
    }
    const tokens = await this.authService.refresh(raw);
    this.refreshCookie.set(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, tokenType: tokens.tokenType };
  }
}
