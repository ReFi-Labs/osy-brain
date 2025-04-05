export interface WebhookEvent {
    subscriptionId: string;
    description: string;
    protocol: string;
    network: string;
    notification: {
      webhookUrl: string;
    };
    eventType: string;
    signingKey: string;
    createdAt: string;
    event: {
      targetAddress: string;
      topics: string[];
      messages: LogMessage[];
    };
  }

export interface LogMessage {
    address: string;
    topics: string[];
    data: string;
    block_number: number;
    transaction_hash: string;
    transaction_index: number;
    block_hash: string;
    block_timestamp: number;
    log_index: number;
    removed: boolean;
    type: string;
}
