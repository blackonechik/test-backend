import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from '../articles/article.entity';
import { Account } from './account.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => Account, (account) => account.user)
  account: Account;

  @OneToMany(() => Article, (article) => article.author)
  articles: Article[];
}
