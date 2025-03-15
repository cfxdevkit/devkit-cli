/**
 * Type definitions for wallet-related interfaces
 * @module WalletTypes
 */

/**
 * Represents an entry in the keystore
 */
export interface KeystoreEntry {
  /** Type of storage (plaintext or encoded) */
  type: "plaintext" | "encoded";
  /** User-defined label for the mnemonic */
  label: string;
  /** The mnemonic phrase (either plaintext or encrypted) */
  mnemonic: string;
}

/**
 * Represents the structure of the keystore file
 */
export interface KeystoreFile {
  /** Array of keystore entries */
  keystore: KeystoreEntry[];
  /** Index of the currently active mnemonic */
  activeIndex: number | null;
}

/** Options for wallet initialization */
export interface WalletOptions {
  /** Custom path for the keystore file */
  keystorePath?: string;
  /** Custom logger instance */
  logger?: Console;
}
