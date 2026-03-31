import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('author')
@Controller('author')
export class AuthorController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Информация о текущем пользователе (авторе)' })
  @ApiOkResponse({
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'author@example.com',
      },
    },
  })
  getMe(@CurrentUser() user: JwtPayloadUser) {
    return { id: user.userId, email: user.email };
  }
}

