import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepo: Repository<Account>,
  ) {}

  async findByEmail(email: string): Promise<Account | null> {
    return this.accountsRepo.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByEmailWithUser(email: string): Promise<Account | null> {
    return this.accountsRepo.findOne({
      where: { email: email.toLowerCase() },
      relations: ['user'],
    });
  }

  async findById(id: string): Promise<Account | null> {
    return this.accountsRepo.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Account | null> {
    return this.accountsRepo.findOne({ where: { userId } });
  }

  async createForUser(
    userId: string,
    email: string,
    passwordHash: string,
  ): Promise<Account> {
    const account = this.accountsRepo.create({
      userId,
      email: email.toLowerCase(),
      passwordHash,
    });
    return this.accountsRepo.save(account);
  }

  async save(account: Account): Promise<Account> {
    return this.accountsRepo.save(account);
  }

  async updateRefreshToken(
    accountId: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ): Promise<void> {
    await this.accountsRepo.update(
      { id: accountId },
      { refreshTokenHash, refreshTokenExpiresAt },
    );
  }

  async replaceRefreshTokenIfStoredHashMatches(
    accountId: string,
    expectedStoredHash: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date,
  ): Promise<boolean> {
    const result = await this.accountsRepo
      .createQueryBuilder()
      .update(Account)
      .set({
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiresAt: newExpiresAt,
      })
      .where('id = :id AND refreshTokenHash = :h', {
        id: accountId,
        h: expectedStoredHash,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
