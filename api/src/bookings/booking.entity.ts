import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Court } from '../courts/court.entity.js';
import { User } from '../users/user.entity.js';

export enum BookingStatus {
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export enum CancelledBy {
  User = 'user',
  Admin = 'admin',
}

// Both booking rules are exclusion constraints defined in migrations: `bookings_no_overlap`
// (InitialSchema) and `bookings_no_back_to_back_same_user` (NoBackToBackBookings).
// TypeORM's @Exclusion would only repeat the same raw SQL here, and with migrations
// (synchronize: false) the migration is the schema's single source.
@Entity({ name: 'bookings' })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'court_id', type: 'uuid' })
  courtId: string;

  @ManyToOne(() => Court, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'court_id' })
  court?: Court;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  // Snapshot of court price × hours at booking time; later price edits don't rewrite revenue.
  @Column({ name: 'price_cents', type: 'integer' })
  priceCents: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.Confirmed,
  })
  status: BookingStatus;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({
    name: 'cancelled_by',
    type: 'enum',
    enum: CancelledBy,
    enumName: 'booking_cancelled_by',
    nullable: true,
  })
  cancelledBy: CancelledBy | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
