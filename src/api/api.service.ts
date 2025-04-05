import { ethers } from 'ethers';
import * as vaultAbi from 'src/contract/abi/vault.abi.json';
import {
  defineCollection, IApyHistoryModel, IPoolModel, IRebalanceHistoryModel
} from 'src/db';

import { Injectable, Logger } from '@nestjs/common';

import { HistoryRequestDto } from './dto';
import { WebhookEvent } from './dto/nodit.request';

@Injectable()
export class ApiService {
  constructor(private readonly logger: Logger) {}

  async getPath(): Promise<IPoolModel> {
    const db = await defineCollection();
    const pools = await db.collection.pool.find({}, { _id: 0, __v: 0 }).sort({ apy: -1 }).limit(1);
    return pools[0];
  }

  async getApyHistory(query: HistoryRequestDto): Promise<IApyHistoryModel[]> {
    const db = await defineCollection();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const filter: Record<string, any> = {};
    if (query.chainId !== undefined) {
      filter.chainId = query.chainId;
    }
    if (query.protocolId !== undefined) {
      filter.protocolId = query.protocolId;
    }

    const history = await db.collection.apyHistory.find(
      filter,
      { _id: 0, __v: 0 }
    )
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return history;
  }


  async getRebalanceHistory(query: HistoryRequestDto): Promise<IRebalanceHistoryModel[]> {
    const db = await defineCollection();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const filter: Record<string, any> = {};
    if (query.chainId !== undefined) {
      filter.chainId = query.chainId;
    }
    if (query.protocolId !== undefined) {
      filter.protocolId = query.protocolId;
    }
    const history = await db.collection.rebalanceHistory.find(
      filter,
      { _id: 0, __v: 0 }
    )
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return history;
  }

  async handleWebhook(body: WebhookEvent): Promise<void> {
    const db = await defineCollection();
    const event = this.parseWebhookLogEvent(body);

    for(const message of event.event.messages) {
      const txHash = message.transaction_hash;
      this.logger.log(`Nodit Webhook TxHash: ${txHash}`);
      const vaultInterface = new ethers.Interface(vaultAbi);
      const parsedLog = vaultInterface.parseLog(message);
      const id = parsedLog.args.messageId;
      const srcChainId = Number(parsedLog.args.srcChainId);
      const dstChainId = Number(parsedLog.args.dstChainId);
      const body = parsedLog.args.body;
      this.logger.log(`Nodit Webhook Message: ${id}, ${srcChainId}, ${dstChainId}, ${body}`);

      await db.collection.cctpMessage.insertOne({
          txHash: txHash,
          id: id,
          srcChainId: srcChainId,
          dstChainId: dstChainId,
          body: body,
          timestamp: Date.now(),
          isSent: false,
      });
    }
  }

  parseWebhookLogEvent(data: any): WebhookEvent {
    const event = data as WebhookEvent;
    return event;
  }
}
