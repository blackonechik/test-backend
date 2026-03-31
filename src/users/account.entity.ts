import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'passwordHash' })
  passwordHash: string;

  @Column({ name: 'refreshTokenHash', type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @Column({ name: 'refreshTokenExpiresAt', type: 'timestamptz', nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Column({ name: 'userId', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
