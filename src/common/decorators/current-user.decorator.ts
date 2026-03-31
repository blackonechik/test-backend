import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtPayloadUser = { userId: string; email: string };

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayloadUser }>();
    return request.user;
  },
);
