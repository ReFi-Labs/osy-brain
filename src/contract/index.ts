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

    async updateTotalSupply(chainId: number, totalSupply: number): Promise<boolean> {
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

        const tx = await contract.updateTotalSupply(chainId, totalSupply,0);
        const receipt = await tx.wait();

        this.logger.log(`Update Total Supply Tx: ${tx.hash}`);

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


    async withdrawAndBridgeAndDeposit(srcChainId: number, dstChainId: number, amount: number, srcProtocolId: number): Promise<string> {
        const db = await defineCollection();

        const vault = await db.collection.vault.findOne({ chainId: srcChainId });
        if(!vault) {
            return '';
        }

        const network = await db.collection.network.findOne({ chainId: srcChainId });
        if(!network) {
            return '';
        }

        const provider = new ethers.JsonRpcProvider(network.rpc);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const contract = new ethers.Contract(vault.address, vaultAbi, wallet);

        const actions = [
            {
                actionChainId: srcChainId,
                protocolId: srcProtocolId,
                amount: amount,
                recipient: ethers.ZeroAddress
            },
            {
                actionChainId: dstChainId,
                protocolId: srcProtocolId === 0 ? 1 : 0,
                amount: amount,
                recipient: ethers.ZeroAddress
            }
        ];
        const tx = await contract.withdrawAndBridgeAndDeposit(actions);
        const receipt = await tx.wait();
        this.logger.log(`Withdraw And Bridge And Deposit Actions: ${JSON.stringify(actions)}`);

        return tx.hash;
    }

    async sendCctpMessage(id: string, message: string, attestation: string): Promise<boolean> {
        const db = await defineCollection();

        const cctpMessage = await db.collection.cctpMessage.findOne({ id });
        if(!cctpMessage) {
            return false;
        }

        const network = await db.collection.network.findOne({ chainId: cctpMessage.dstChainId });
        if(!network) {
            return false;
        }
        const vault = await db.collection.vault.findOne({ chainId: cctpMessage.dstChainId });
        if(!vault) {
            return false;
        }

        const provider = new ethers.JsonRpcProvider(network.rpc);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(vault.address, vaultAbi, wallet);

        const tx = await contract.handleCCTP(message, attestation, cctpMessage.id, cctpMessage.body, {gasLimit: 1000000});
        await db.collection.cctpMessage.updateOne({ id: cctpMessage.id }, {dstTxHash: tx.hash});
        const receipt = await tx.wait();

        this.logger.log(`Send CCTP Message Tx: ${tx.hash}`);
        return receipt.status === 1;
    }
}