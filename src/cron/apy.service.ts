import axios from 'axios';
import { defineCollection } from 'src/db';

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ApyService {
    private readonly logger = new Logger(ApyService.name);

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

    @Cron('*/10 * * * *') // 매 10분마다 실행
    async handleCron() {
        try {
            const response = await axios.get('https://yields.llama.fi/pools');
            const pools = response.data.data;

            const filteredEtherPools = pools.filter((pool: any) =>
                pool.chain === 'Ethereum' &&
                ['aave-v3'].includes(pool.project) &&
                pool.symbol.includes('USDC') &&
                pool.tvlUsd > 100000000
            );

            const filteredBasePools = pools.filter((pool: any) =>
                pool.chain === 'Base' &&
                ['compound-v3'].includes(pool.project) &&
                pool.symbol.includes('USDC') &&
                pool.tvlUsd > 1000000
            );

            const db = await defineCollection();
            for(const pool of filteredEtherPools) {
                const poolData = await db.collection.pool.findOne({ project: pool.project, symbol: pool.symbol, chainId: 11155111 });
                if(!poolData) {
                    return;
                }

                await poolData.updateOne({apy: pool.apy});
                await db.collection.apyHistory.insertOne({ protocolId: poolData.protocolId, chainId: 11155111, apy: pool.apy, timestamp: Date.now() });
            }

            for(const pool of filteredBasePools) {
                const poolData = await db.collection.pool.findOne({ project: pool.project, symbol: pool.symbol, chainId: 84532 });
                if(!poolData) {
                    return;
                }
                await poolData.updateOne({apy: pool.apy});

                await db.collection.apyHistory.insertOne({ protocolId: poolData.protocolId, chainId: 84532, apy: pool.apy, timestamp: Date.now() });
            }

            this.logger.log('APY History Inserted');
        } catch (error) {
            this.logger.error('API 호출 중 오류 발생:');
        }
    }
}