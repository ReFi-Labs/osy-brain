import axios from 'axios';
import { ContractService } from 'src/contract';
import { defineCollection } from 'src/db';

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CircleService {
    private readonly logger = new Logger(CircleService.name);

    constructor() {
        process.on('uncaughtException', (err) => {
            this.logger.error('❗ [Uncaught Exception] ', err);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('❗ [Unhandled Rejection] ', reason);
        });
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async retry<T>(fn: () => Promise<T>, retries = 5, delayMs = 1000): Promise<T> {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err) {
                if (i === retries - 1) throw err;
                await this.delay(delayMs);
            }
        }
    }

    @Cron('*/30 * * * * *')
    async sendCctpMessage() {
        const db = await defineCollection();

        const cctpMessages = await db.collection.cctpMessage.find({ isSent: false });
        if(cctpMessages.length === 0) {
            return;
        }

        const contractService = new ContractService();

        for(const cctpMessage of cctpMessages) {
            const cctpChainId = Number(cctpMessage.srcChainId) === 11155111 ? 0 : 6;
            const response = await axios.get(`https://iris-api-sandbox.circle.com/v1/messages/${cctpChainId}/${cctpMessage.txHash}`);

            if(response.status !== 200) {
                continue;
            }

            const data = response.data;
            if(data.error) {
                this.logger.error(`Message Not Found ${cctpMessage.txHash}`);
                continue;
            }

            if(data.messages.length === 0) {
                this.logger.error(`Message Not Found ${cctpMessage.txHash}`);
                continue;
            }

            const message = data.messages[0];
            const attestation = message.attestation;
            const _message = message.message;

            const result = await this.retry(async () => await contractService.sendCctpMessage(cctpMessage.id, _message, attestation));
            if(result) {
                await db.collection.cctpMessage.updateOne({ id: cctpMessage.id }, { $set: { isSent: true } });
            }
            else {
                this.logger.error(`Message Send Failed ${cctpMessage.id}`);
            }
        }
    }
}