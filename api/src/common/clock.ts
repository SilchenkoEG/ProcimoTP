import { Global, Injectable, Module } from '@nestjs/common';

/**
 * The single source of "now" for business rules (past bookings, 2 h cancellation
 * window, "upcoming"). Tests replace it with a fixed time, so the rules are
 * deterministic instead of depending on when the test suite runs.
 */
export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
