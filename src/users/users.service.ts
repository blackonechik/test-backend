import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(displayName?: string | null): Promise<User> {
    const user = this.usersRepo.create({
      displayName: displayName ?? null,
    });
    return this.usersRepo.save(user);
  }

  async findById(
    id: string,
    relations?: FindUserRelations,
  ): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      relations: relations ?? [],
    });
  }
}

export type FindUserRelations = ('account' | 'articles')[];
