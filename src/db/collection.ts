import { Model } from 'mongoose';

import {
  IApyHistoryModel, ICctpMessageModel, INetworkModel, IPoolModel,
  IRebalanceHistoryModel, ISyncModel, IVaultModel
} from './models';

interface IMongoCollection {
    rebalanceHistory: Model<IRebalanceHistoryModel>;
    apyHistory: Model<IApyHistoryModel>;
    pool: Model<IPoolModel>;
    network: Model<INetworkModel>;
    vault: Model<IVaultModel>;
    sync: Model<ISyncModel>;
    cctpMessage: Model<ICctpMessageModel>;
}


export { IMongoCollection };