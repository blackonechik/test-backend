import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity';
import { AccountsService } from './accounts.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Account])],
  providers: [UsersService, AccountsService],
  exports: [UsersService, AccountsService],
})
export class UsersModule {}
