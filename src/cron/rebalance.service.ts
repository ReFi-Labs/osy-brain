import { ContractService } from 'src/contract/contract';
import { defineCollection } from 'src/db';

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RebalanceService {
    private readonly logger = new Logger(RebalanceService.name);

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

    @Cron('*/20 * * * * *') // 20초마다 실행
    async rebalance() {
        const db = await defineCollection();
        const contractService = new ContractService();
        const pools = await db.collection.pool.find({}, { _id: 0, __v: 0 }).sort({ apy: -1 }).limit(1);
        const bestPool = pools[0];

        const vaults = await db.collection.vault.find({});
        const vaultBalances = {};

        for(const vault of vaults) {
            if(vault.chainId === bestPool.chainId) {
                continue;
            }

            const currentChainSupply = await this.retry(() => contractService.currentChainSupply(vault.chainId));
            const maxAmount = 10 * 10 ** 6;
            const rebalanceAmount = Math.min(Number(currentChainSupply), maxAmount);
            vaultBalances[vault.chainId] = rebalanceAmount;
        }

        const keys = Object.keys(vaultBalances);
        for(const key of keys) {
            const vault = await db.collection.vault.findOne({ chainId: parseInt(key) });
            if(!vault) {
                continue;
            }

            const balance = vaultBalances[key];

            const unit = 10 ** 6;
            if(balance > unit * 10) { // 10 개 이상 있을때만
                this.logger.log(`Rebalance: ${vault.chainId} ${balance}`);
                let srcProtocolId = 1;
                if(vault.chainId === 11155111) {
                    srcProtocolId = 0;
                }

                this.logger.log(`Rebalance: ${vault.chainId}, ${bestPool.chainId}, ${balance}, ${srcProtocolId}`);

                let txHash = await this.retry(() => contractService.withdrawAndBridgeAndDeposit(vault.chainId, bestPool.chainId, balance - unit, srcProtocolId));
                if(txHash === '') {
                    this.logger.error(`Rebalance Failed: ${vault.chainId} ${balance}`);
                }

                const vaultApy = await db.collection.apyHistory.findOne({ chainId: vault.chainId }, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).limit(1);
                await db.collection.rebalanceHistory.insertOne({
                    txHash: txHash,
                    srcChainId: vault.chainId,
                    dstChainId: bestPool.chainId,
                    srcProtocolId: srcProtocolId,
                    dstProtocolId: bestPool.protocolId,
                    amount: balance,
                    improvementApy: bestPool.apy - vaultApy.apy,
                    timestamp: Date.now()
                });
                this.logger.log(`Rebalance Success: ${vault.chainId} ${balance}`);
            } else {
                this.logger.log(`Not Rebalance Condition: ${vault.chainId} ${balance}`);
            }
        }
    }
}