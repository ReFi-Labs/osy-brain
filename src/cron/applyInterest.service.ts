import { ContractService } from 'src/contract/contract';
import { defineCollection } from 'src/db';

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ApplyInterestService {
    private readonly logger = new Logger(ApplyInterestService.name);

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

    @Cron('0 */10 * * * *') // 5분마다 실행
    async handleApplyInterest() {
        try {
            const db = await defineCollection();
            const contractService = new ContractService();
            const vaults = await db.collection.vault.find({});
            const chainSupply = {};
            for(const vault of vaults) {
                if(vault.isMain) {
                    continue;
                }

                const currentChainSupply = await this.retry(() => contractService.currentChainSupply(vault.chainId));
                if(currentChainSupply === 0) {
                    continue;
                }
                chainSupply[String(vault.chainId)] = currentChainSupply;
            }

            for(const key of Object.keys(chainSupply)) {
                this.logger.log(`Requesting Total Supply: ${key} ${chainSupply[key]}`);
                await this.retry(() => contractService.requestTotalSupply(parseInt(key)));
            }

            this.logger.log('Requesting Total Supply Done');
            await this.retry(() => contractService.applyInterest());
            this.logger.log('Interest Applied');
        } catch (error) {
            this.logger.error(`Interest Apply Failed: ${error}`);
        }
    }
}