import { Response } from 'express';

import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';

import { ApiService } from './api.service';
import { HistoryRequestDto } from './dto';
import { WebhookEvent } from './dto/nodit.request';

@Controller()
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('/path')
  async getPath(@Res() res: Response): Promise<void> {
    const pool = await this.apiService.getPath();
    res.status(200).
    json(pool);
  }

  @Get('/apy-history')
  async getApyHistory(@Res() res: Response, @Query() query: HistoryRequestDto): Promise<void> {
    const history = await this.apiService.getApyHistory(query);
    res.status(200).json(history);
  }

  @Get('/rebalance-history')
  async getRebalanceHistory(@Res() res: Response, @Query() query: HistoryRequestDto): Promise<void> {
    const history = await this.apiService.getRebalanceHistory(query);
    res.status(200).json(history);
  }

  @Post('/webhook')
  async webhook(@Res() res: Response, @Body() body: WebhookEvent): Promise<void> {
    await this.apiService.handleWebhook(body);
    res.status(200).json(body);
  }
}
