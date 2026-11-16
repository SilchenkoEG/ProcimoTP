import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

const HH_MM: ValueTransformer = {
  from: (value: string) => value.slice(0, 5),
  to: (value: unknown) => value,
};

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

  // Facility-local wall-clock times, the same every day. Postgres returns `time` as
  // "08:00:00"; the transformer trims it once here, so the app only ever sees "08:00".
  @Column({ name: 'opens_at', type: 'time', transformer: HH_MM })
  opensAt: string;

  @Column({ name: 'closes_at', type: 'time', transformer: HH_MM })
  closesAt: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
