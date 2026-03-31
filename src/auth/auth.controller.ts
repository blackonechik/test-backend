import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshCookieHelper } from './refresh-cookie.helper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshCookie: RefreshCookieHelper,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    description: 'access + Set-Cookie refresh',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto.email, dto.password);
    this.refreshCookie.set(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, tokenType: tokens.tokenType };
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'access + Set-Cookie refresh',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password);
    this.refreshCookie.set(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, tokenType: tokens.tokenType };
  }

  @Post('refresh')
  @ApiCookieAuth('refresh-cookie')
  @ApiOperation({ summary: 'Refresh токенов' })
  @ApiOkResponse({
    description: 'новый access, cookie перезаписана',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('refresh-cookie')
  @ApiOperation({ summary: 'Выход' })
  @ApiOkResponse({
    schema: { example: { success: true } },
  })
  async logout(
    @CurrentUser() user: JwtPayloadUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.userId);
    this.refreshCookie.clear(res);
    return { success: true };
  }
}
