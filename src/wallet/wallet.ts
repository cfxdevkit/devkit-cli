/**
 * Wallet management module for handling HD wallets and key derivation
 * @module Wallet
 */

import { KeystoreManager } from "./keystore_manager.js";
import { MnemonicManager } from "./mnemonic_manager.js";
import { EncryptionService } from "./encryption_service.js";
import { createLogger } from "../utils/logger.js";
import {
  generatePrivateKey,
  privateKeyToAccount as espacePrivateKeyToAccount,
} from "viem/accounts";
import { privateKeyToAccount as corePrivateKeyToAccount } from "cive/accounts";
import { mnemonicToSeed, validateMnemonic } from "bip39";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";
import inquirer from "inquirer";
import type { KeystoreEntry } from "../types/wallet.js";

const bip32 = BIP32Factory(ecc);
const logger = createLogger("wallet");

/**
 * Manages HD wallet operations including key derivation and mnemonic management
 * @class Wallet
 */
export class Wallet {
  private keystoreManager: KeystoreManager;
  private mnemonicManager: MnemonicManager;
  private mnemonic?: string;

  /**
   * Creates a new wallet instance
   * @constructor
   */
  constructor() {
    this.keystoreManager = new KeystoreManager();
    this.mnemonicManager = new MnemonicManager(this.keystoreManager, new EncryptionService());
  }

  /**
   * Initializes the keystore with a default mnemonic if none exists
   * @async
   * @returns {Promise<void>}
   */
  async initializeKeystore(): Promise<void> {
    try {
      logger.debug("Attempting to read existing keystore...");
      const existingKeystore = await this.keystoreManager.readKeystore();

      if (!existingKeystore) {
        logger.warn("No valid keystore found. Creating a default keystore...");
        // Initialize with default mnemonic
        const defaultKeystore: KeystoreEntry[] = [
          {
            type: "plaintext" as const,
            label: "Default Keystore",
            mnemonic: "test test test test test test test test test test test junk",
          },
        ];

        this.keystoreManager.setKeystore(defaultKeystore);
        this.keystoreManager.setActiveIndex(0);
        await this.keystoreManager.writeKeystore();
        logger.warn("Default keystore created and activated.");
      } else {
        logger.debug("Existing keystore found, setting up wallet state...");
        this.keystoreManager.setKeystore(existingKeystore.keystore);
        this.keystoreManager.setActiveIndex(existingKeystore.activeIndex ?? 0);
      }

      // Get the active mnemonic
      this.mnemonic = await this.getActiveMnemonic();
      logger.debug("Successfully initialized wallet with active mnemonic");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize keystore: ${errMsg}`);
      throw new Error(`Failed to initialize keystore: ${errMsg}`);
    }
  }

  /**
   * Gets the currently active mnemonic
   * @async
   * @returns {Promise<string>} The active mnemonic phrase
   */
  async getActiveMnemonic(): Promise<string> {
    try {
      const keystore = this.keystoreManager.getKeystore();
      const activeIndex = this.keystoreManager.getActiveIndex();

      if (!keystore || keystore.length === 0) {
        throw new Error("Keystore is empty");
      }

      if (activeIndex >= keystore.length) {
        logger.warn(`Invalid active index ${activeIndex}, resetting to 0`);
        this.keystoreManager.setActiveIndex(0);
      }

      if (this.mnemonic) {
        return this.mnemonic;
      }

      const mnemonicObj = keystore[this.keystoreManager.getActiveIndex()];
      if (!mnemonicObj) {
        throw new Error("Failed to get active mnemonic entry");
      }

      return mnemonicObj.type === "encoded"
        ? await this.mnemonicManager.encryptionService.decryptMnemonic(mnemonicObj.mnemonic)
        : mnemonicObj.mnemonic;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get active mnemonic: ${errMsg}`);
      throw new Error(`Failed to get active mnemonic: ${errMsg}`);
    }
  }

  /**
   * Gets the label of the active mnemonic
   * @returns {string} Active mnemonic label
   */
  getActiveMnemonicLabel(): string {
    if (this.keystoreManager.getActiveIndex() === null) {
      throw new Error("No active mnemonic selected.");
    }
    const mnemonicObj = this.keystoreManager.getKeystore()[this.keystoreManager.getActiveIndex()];
    return mnemonicObj.label;
  }

  /**
   * Adds a new mnemonic to the keystore
   * @async
   * @returns {Promise<void>}
   */
  async addMnemonic(): Promise<void> {
    const newIndex = await this.mnemonicManager.addMnemonic();

    const { setActive } = await inquirer.prompt([
      {
        type: "list",
        name: "setActive",
        message: "Would you like to set this as your active mnemonic?",
        choices: [
          { name: "Yes", value: "yes" },
          { name: "No", value: "no" },
        ],
      },
    ]);

    if (setActive === "yes") {
      this.keystoreManager.setActiveIndex(newIndex);
      await this.keystoreManager.writeKeystore();
      this.mnemonic = await this.getActiveMnemonic();
      logger.debug(`Active wallet set to: ${this.getActiveMnemonicLabel()}`);
    }
  }

  /**
   * Selects an active mnemonic
   * @async
   * @returns {Promise<void>}
   */
  async selectActiveMnemonic(): Promise<void> {
    const currentIndex = this.keystoreManager.getActiveIndex();
    const { selectedIndex } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedIndex",
        message: "Select the active mnemonic:",
        choices: this.keystoreManager
          .getKeystore()
          .map((mnemonicObj: KeystoreEntry, index: number) => ({
            name: mnemonicObj.label,
            value: index,
          })),
      },
    ]);

    this.keystoreManager.setActiveIndex(selectedIndex);
    await this.keystoreManager.writeKeystore();
    if (selectedIndex !== currentIndex) {
      this.mnemonic = await this.getActiveMnemonic();
    }
    logger.debug(`Active wallet set to: ${this.getActiveMnemonicLabel()}`);
  }

  /**
   * Deletes a mnemonic from the keystore
   * @async
   * @returns {Promise<void>}
   */
  async deleteMnemonic(): Promise<void> {
    const keystore = this.keystoreManager.getKeystore();
    if (keystore.length <= 1) {
      throw new Error("No additional mnemonics to delete");
    }

    const { selectedIndex } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedIndex",
        message: "Select the mnemonic to delete:",
        choices: keystore.slice(1).map((mnemonicObj: KeystoreEntry, index: number) => ({
          name: `${mnemonicObj.label}${index + 1 === this.keystoreManager.getActiveIndex() ? " (active)" : ""}`,
          value: index + 1,
        })),
      },
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: "list",
        name: "confirm",
        message: "Are you sure you want to delete this mnemonic?",
        choices: [
          { name: "No, cancel", value: "no" },
          { name: "Yes, delete", value: "yes" },
        ],
      },
    ]);

    if (confirm === "yes") {
      await this.mnemonicManager.deleteMnemonic(selectedIndex);
      if (selectedIndex === this.keystoreManager.getActiveIndex()) {
        this.mnemonic = undefined;
      }
    }
  }

  /**
   * Derives a private key from the active mnemonic using a derivation path
   * @private
   * @async
   * @param {string} derivationPath - BIP32 derivation path
   * @returns {Promise<string>} Derived private key
   */
  private async derivePrivateKey(derivationPath: string): Promise<string> {
    const mnemonic = await this.getActiveMnemonic();
    if (!validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic");
    }

    const seed = await mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(Buffer.from(seed));
    const child = root.derivePath(derivationPath);

    if (!child.privateKey) {
      throw new Error("Unable to derive private key");
    }

    return `0x${child.privateKey.toString("hex")}`;
  }

  /**
   * Gets a private key by derivation path
   * @async
   * @param {string} path - Derivation path
   * @returns {Promise<string>} Private key
   */
  async privateKeyByDerivationPath(path: string): Promise<string> {
    return this.derivePrivateKey(path);
  }

  /**
   * Gets an eSpace private key
   * @async
   * @param {number} index - Derivation index
   * @returns {Promise<string>} Private key
   */
  async espacePrivateKey(index: number): Promise<string> {
    return this.derivePrivateKey(`m/44'/60'/0'/0/${index}`);
  }

  /**
   * Gets a Core private key
   * @async
   * @param {number} index - Derivation index
   * @returns {Promise<string>} Private key
   */
  async corePrivateKey(index: number): Promise<string> {
    return this.derivePrivateKey(`m/44'/503'/0'/0/${index}`);
  }

  /**
   * Gets an eSpace address
   * @async
   * @param {number} index - Derivation index
   * @returns {Promise<string>} Address
   */
  async espaceAddress(index: number): Promise<string> {
    const privateKey = await this.espacePrivateKey(index);
    return espacePrivateKeyToAccount(privateKey as `0x${string}`).address;
  }

  /**
   * Gets a Core address
   * @async
   * @param {number} index - Derivation index
   * @param {number} networkId - Network ID for address generation
   * @returns {Promise<string>} Address
   */
  async coreAddress(index: number, networkId?: number): Promise<string> {
    const privateKey = await this.corePrivateKey(index);
    return corePrivateKeyToAccount(privateKey as `0x${string}`, { networkId: networkId || 1029 })
      .address;
  }

  /**
   * Generates a random private key
   * @returns {string} Generated private key
   */
  generatePrivateKey(): `0x${string}` {
    return generatePrivateKey();
  }
}
