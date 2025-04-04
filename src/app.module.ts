import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ApiController } from './api/api.controller';
import { ApiService } from './api/api.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [CronModule],
  controllers: [AppController, ApiController],
  providers: [AppService, ApiService, Logger],
})
export class AppModule {}
