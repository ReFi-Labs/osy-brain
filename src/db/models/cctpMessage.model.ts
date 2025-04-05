import { Schema } from 'mongoose';

interface ICctpMessageModel {
    txHash: string;
    dstTxHash?: string;
    id: string;
    srcChainId: number;
    dstChainId: number;
    body: string;
    isSent: boolean;
    timestamp: number;
}

const CctpMessageSchema = new Schema<ICctpMessageModel>({
    txHash: { type: String, required: true },
    dstTxHash: { type: String, required: false },
    id: { type: String, required: true },
    srcChainId: { type: Number, required: true },
    dstChainId: { type: Number, required: true },
    body: { type: String, required: true },
    isSent: { type: Boolean, required: true },
    timestamp: { type: Number, required: true },
});

export { ICctpMessageModel, CctpMessageSchema };