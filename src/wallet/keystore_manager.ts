/**
 * Keystore management module for secure storage of wallet mnemonics
 * @module KeystoreManager
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { KeystoreEntry, KeystoreFile, WalletOptions } from "../types/wallet.js";
import { createLogger } from "../utils/logger.js";

/**
 * Interface defining keystore management operations
 * @interface IKeystoreManager
 */
export interface IKeystoreManager {
  readKeystore(): Promise<KeystoreFile | null>;
  writeKeystore(): Promise<void>;
  getKeystore(): KeystoreEntry[];
  setKeystore(keystore: KeystoreEntry[]): void;
  getActiveIndex(): number;
  setActiveIndex(index: number | null): void;
}

/**
 * Manages keystore operations for secure mnemonic storage
 * @class KeystoreManager
 * @implements {IKeystoreManager}
 */
export class KeystoreManager implements IKeystoreManager {
  private keystorePath: string;
  private keystore: KeystoreEntry[] = [];
  private activeIndex: number | null = null;
  private logger = createLogger("keystore");

  /**
   * Creates a new keystore manager instance
   * @constructor
   */
  constructor(options?: WalletOptions) {
    this.keystorePath =
      options?.keystorePath ||
      join(process.env.HOME || process.env.USERPROFILE || "", ".devkit.keystore.json");
    this.logger.debug(`Initializing keystore at path: ${this.keystorePath}`);
  }

  /**
   * Ensures the keystore file exists and is properly initialized
   * @private
   */
  private async ensureKeystoreFile(): Promise<void> {
    try {
      await fs.access(this.keystorePath);
      const content = await fs.readFile(this.keystorePath, "utf8");
      if (!content.trim()) {
        this.logger.debug("Keystore file exists but is empty, initializing...");
        await this.initializeEmptyKeystore();
      }
    } catch (error: unknown) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        this.logger.debug("Keystore file does not exist, creating new one...");
        await this.initializeEmptyKeystore();
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to access keystore at ${this.keystorePath}: ${errMsg}`);
        throw new Error(`Failed to access keystore: ${errMsg}`);
      }
    }
  }

  /**
   * Initializes an empty keystore file
   * @private
   */
  private async initializeEmptyKeystore(): Promise<void> {
    try {
      const emptyKeystore: KeystoreFile = {
        keystore: [],
        activeIndex: null,
      };
      const dirPath = join(this.keystorePath, "..");
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(this.keystorePath, JSON.stringify(emptyKeystore, null, 2));
      this.logger.debug("Empty keystore initialized successfully");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize empty keystore: ${errMsg}`);
      throw new Error(`Failed to initialize keystore: ${errMsg}`);
    }
  }

  /**
   * Reads the keystore file
   * @async
   * @returns {Promise<KeystoreFile | null>} The keystore contents or null if not found
   */
  async readKeystore(): Promise<KeystoreFile | null> {
    try {
      await this.ensureKeystoreFile();
      const data = await fs.readFile(this.keystorePath, "utf8");
      const parsed = JSON.parse(data);

      // If the keystore is empty or invalid, return null to trigger default initialization
      if (!parsed || !parsed.keystore || parsed.keystore.length === 0) {
        this.logger.debug("Empty or invalid keystore found");
        return null;
      }

      this.logger.debug("Keystore read successfully");
      return parsed;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to read keystore: ${errMsg}`);
      if (error instanceof SyntaxError) {
        this.logger.debug("Invalid JSON in keystore, treating as empty");
        return null;
      }
      throw new Error(`Failed to read keystore: ${errMsg}`);
    }
  }

  /**
   * Writes the current keystore to file
   * @async
   * @returns {Promise<void>}
   */
  async writeKeystore(): Promise<void> {
    try {
      const dirPath = join(this.keystorePath, "..");
      await fs.mkdir(dirPath, { recursive: true });

      const data: KeystoreFile = {
        keystore: this.keystore,
        activeIndex: this.activeIndex,
      };
      await fs.writeFile(this.keystorePath, JSON.stringify(data, null, 2));
      this.logger.debug("Keystore written successfully");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to write keystore: ${errMsg}`);
      throw new Error(`Failed to write keystore: ${errMsg}`);
    }
  }

  /**
   * Gets the current keystore entries
   * @returns {KeystoreEntry[]} Array of keystore entries
   */
  getKeystore(): KeystoreEntry[] {
    return this.keystore;
  }

  /**
   * Sets the keystore entries
   * @param {KeystoreEntry[]} keystore - New keystore entries
   */
  setKeystore(keystore: KeystoreEntry[]): void {
    this.keystore = keystore;
  }

  /**
   * Gets the index of the active mnemonic
   * @returns {number} Active mnemonic index
   */
  getActiveIndex(): number {
    return this.activeIndex ?? 0;
  }

  /**
   * Sets the active mnemonic index
   * @param {number | null} index - New active index
   */
  setActiveIndex(index: number | null): void {
    this.activeIndex = index;
  }
}
