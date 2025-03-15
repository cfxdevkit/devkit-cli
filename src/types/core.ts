/**
 * Type definitions for Conflux Core Space
 */

/**
 * Represents a block in the Conflux Core Space
 */
export interface Block {
  /** Block hash */
  hash: `0x${string}`;
  /** Block nonce */
  nonce: `0x${string}`;
  /** Epoch number */
  epochNumber: bigint;
  /** Custom fields */
  custom: `0x${string}`[];
  /** Gas used */
  gasUsed: bigint;
  /** PoS reference */
  posReference: `0x${string}`;
  /** Base fee per gas */
  baseFeePerGas: bigint;
  /** Whether block is adaptive */
  adaptive: boolean;
  /** Blame number */
  blame: bigint;
  /** Deferred logs bloom hash */
  deferredLogsBloomHash: `0x${string}`;
  /** Block timestamp */
  timestamp: bigint;
  /** Block size */
  size: bigint;
  /** Block difficulty */
  difficulty: bigint;
  /** Block gas limit */
  gasLimit: bigint;
  /** Block transactions */
  transactions: `0x${string}`[];
  /** Block parent hash */
  parentHash: `0x${string}`;
  /** Block height */
  height: bigint;
  /** Block miner */
  miner: string;
  /** Block referee hashes */
  refereeHashes: `0x${string}`[];
  /** Block state root */
  stateRoot: `0x${string}`;
  /** Block transactions root */
  transactionsRoot: `0x${string}`;
  /** Block receipts root */
  receiptsRoot: `0x${string}`;
}

/**
 * Represents a transaction in the Conflux Core Space
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
  from:
    | `CFX:TYPE.USER:${string}`
    | `CFX:TYPE.CONTRACT:${string}`
    | `CFX:TYPE.BUILTIN:${string}`
    | `CFX:TYPE.NULL:${string}`
    | `CFXTEST:TYPE.USER:${string}`
    | `CFXTEST:TYPE.CONTRACT:${string}`
    | `CFXTEST:TYPE.BUILTIN:${string}`
    | `CFXTEST:TYPE.NULL:${string}`;
  /** Transaction recipient address */
  to?:
    | `CFX:TYPE.USER:${string}`
    | `CFX:TYPE.CONTRACT:${string}`
    | `CFX:TYPE.BUILTIN:${string}`
    | `CFX:TYPE.NULL:${string}`
    | `CFXTEST:TYPE.USER:${string}`
    | `CFXTEST:TYPE.CONTRACT:${string}`
    | `CFXTEST:TYPE.BUILTIN:${string}`
    | `CFXTEST:TYPE.NULL:${string}`;
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
