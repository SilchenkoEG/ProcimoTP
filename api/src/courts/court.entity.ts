import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Sport {
  Tennis = 'tennis',
  Padel = 'padel',
  Squash = 'squash',
}

@Entity({ name: 'courts' })
export class Court {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'enum', enum: Sport, enumName: 'court_sport' })
  sport: Sport;

  // Money as integer cents — no floating-point rounding.
  @Column({ name: 'price_cents', type: 'integer' })
  priceCents: number;

  // Facility-local wall-clock times ("08:00:00"), the same every day.
  @Column({ name: 'opens_at', type: 'time' })
  opensAt: string;

  @Column({ name: 'closes_at', type: 'time' })
  closesAt: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
