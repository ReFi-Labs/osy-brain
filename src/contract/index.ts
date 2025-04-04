import { ethers } from 'ethers';
import { defineCollection } from 'src/db';

import { Logger } from '@nestjs/common';

import * as vaultAbi from './abi/vault.abi.json';

export class ContractService {
    private readonly logger = new Logger(ContractService.name);

    async requestTotalSupply(chainId: number): Promise<boolean> {
        const db = await defineCollection();

        const vault = await db.collection.vault.findOne({ chainId, isMain: false });
        const network = await db.collection.network.findOne({ chainId });
        if(!vault || !network) {
            return false;
        }

        const provider = new ethers.JsonRpcProvider(network.rpc);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const contract = new ethers.Contract(vault.address, vaultAbi, wallet);

        const tx = await contract.requestTotalSupply(0);
        const receipt = await tx.wait();

        return receipt.status === 1;
    }

    async applyInterest(): Promise<boolean> {
        const db = await defineCollection();

        const mainVault = await db.collection.vault.findOne({ isMain: true });
        if(!mainVault) {
            return;
        }

        const network = await db.collection.network.findOne({ chainId: mainVault.chainId });
        if(!network) {
            return;
        }

        const provider = new ethers.JsonRpcProvider(network.rpc);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const contract = new ethers.Contract(mainVault.address, vaultAbi, wallet);

        const tx = await contract.applyInterest();
        const receipt = await tx.wait();

        this.logger.log(`Apply Interest Tx: ${tx.hash}`);

        return receipt.status === 1;
    }

    async totalSupply(chainId: number): Promise<number> {
        const db = await defineCollection();

        const vault = await db.collection.vault.findOne({ chainId, isMain: false });
        if(!vault) {
            return 0;
        }

        const network = await db.collection.network.findOne({ chainId });
        if(!network) {
            return 0;
        }

        const provider = new ethers.JsonRpcProvider(network.rpc);
        const contract = new ethers.Contract(vault.address, vaultAbi, provider);
        const totalSupply = await contract.totalSupply();

        return totalSupply;
    }

    async currentChainSupply(chainId: number): Promise<number> {
        const db = await defineCollection();

        const vault = await db.collection.vault.findOne({ chainId });
        if(!vault) {
            this.logger.error(`vault not found: ${chainId}`);
            return 0;
        }

        const network = await db.collection.network.findOne({ chainId });
        if(!network) {
            this.logger.error(`network not found: ${chainId}`);
            return 0;
        }

        const provider = new ethers.JsonRpcProvider(network.rpc);
        const contract = new ethers.Contract(vault.address, vaultAbi, provider);
        const currentChainSupply = await contract.currentChainSupply();

        return currentChainSupply;
    }
}