/**
 * Type definitions for Conflux eSpace
 */

/**
 * Represents a block in the Conflux eSpace
 */
export interface Block {
  /** Block number */
  number: bigint;
  /** Block hash */
  hash: `0x${string}`;
  /** Block timestamp */
  timestamp: bigint;
  /** Block transactions */
  transactions: `0x${string}`[];
  /** Block parent hash */
  parentHash: `0x${string}`;
  /** Block state root */
  stateRoot: `0x${string}`;
  /** Block transactions root */
  transactionsRoot: `0x${string}`;
  /** Block receipts root */
  receiptsRoot: `0x${string}`;
  /** Block miner */
  miner: `0x${string}`;
  /** Block difficulty */
  difficulty: bigint;
  /** Block gas limit */
  gasLimit: bigint;
  /** Block gas used */
  gasUsed: bigint;
  /** Block nonce */
  nonce: `0x${string}`;
  /** Block base fee per gas */
  baseFeePerGas?: bigint;
  /** Block withdrawals */
  withdrawals?: Array<{
    index: bigint;
    validatorIndex: bigint;
    address: `0x${string}`;
    amount: bigint;
  }>;
}

/**
 * Represents a transaction in the Conflux eSpace
 */
export interface Transaction {
  /** Transaction hash */
  hash: `0x${string}`;
  /** Transaction nonce */
  nonce: bigint;
  /** Block hash where this transaction was included */
  blockHash?: `0x${string}`;
  /** Block number where this transaction was included */
  blockNumber?: bigint;
  /** Transaction index in the block */
  transactionIndex?: bigint;
  /** Transaction sender address */
  from: `0x${string}`;
  /** Transaction recipient address */
  to?: `0x${string}`;
  /** Transaction value in CFX */
  value: bigint;
  /** Transaction gas price (for legacy transactions) */
  gasPrice?: bigint;
  /** Transaction max fee per gas (for EIP-1559) */
  maxFeePerGas?: bigint;
  /** Transaction max priority fee per gas (for EIP-1559) */
  maxPriorityFeePerGas?: bigint;
  /** Transaction gas limit */
  gas: bigint;
  /** Transaction data */
  data: `0x${string}`;
  /** Transaction type */
  type: "legacy" | "eip2930" | "eip1559";
  /** Transaction chain ID */
  chainId: bigint;
  /** Transaction access list (for EIP-2930) */
  accessList?: Array<{
    address: `0x${string}`;
    storageKeys: `0x${string}`[];
  }>;
  /** Transaction v value */
  v: bigint;
  /** Transaction r value */
  r: `0x${string}`;
  /** Transaction s value */
  s: `0x${string}`;
}
