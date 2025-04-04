import { Logger, Module } from '@nestjs/common';

import { ApiController } from './api.controller';
import { ApiService } from './api.service';

@Module({
  imports: [],
  controllers: [ApiController],
  providers: [ApiService, Logger],
})
export class ApiModule {}
