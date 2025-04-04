import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ApplyInterestService } from './applyInterest.service';
import { ApyService } from './apy.service';
import { CircleService } from './circle.service';
import { RebalanceService } from './rebalance.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CircleService, ApyService, RebalanceService, ApplyInterestService],
  exports: [],
})
export class CronModule {}
