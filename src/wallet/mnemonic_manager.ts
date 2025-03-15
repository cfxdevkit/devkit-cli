/**
 * Mnemonic management module for handling wallet seed phrases
 * @module MnemonicManager
 */

import { KeystoreManager } from "./keystore_manager.js";
import { EncryptionService } from "./encryption_service.js";
import { generateMnemonic, wordlists } from "bip39";
import inquirer from "inquirer";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("mnemonic-manager");

/**
 * Manages mnemonic operations including generation, import, and storage
 * @class MnemonicManager
 */
export class MnemonicManager {
  public encryptionService: EncryptionService;

  /**
   * Creates a new mnemonic manager instance
   * @constructor
   * @param {KeystoreManager} keystoreManager - Keystore manager instance
   * @param {EncryptionService} encryptionService - Encryption service instance
   */
  constructor(
    private keystoreManager: KeystoreManager,
    encryptionService: EncryptionService
  ) {
    this.encryptionService = encryptionService;
  }

  /**
   * Adds a new mnemonic to the keystore
   * @async
   * @returns {Promise<number>} Index of the newly added mnemonic
   */
  async addMnemonic(): Promise<number> {
    const { storageChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "storageChoice",
        message: "Choose storage option for the mnemonic:",
        choices: [
          { name: "Store encrypted", value: "e" },
          { name: "Store in plaintext", value: "p" },
        ],
      },
    ]);

    const mnemonic = await this.promptForMnemonic();

    const { label } = await inquirer.prompt([
      {
        type: "input",
        name: "label",
        message: "Enter a label for this mnemonic:",
        default: `Mnemonic ${this.keystoreManager.getKeystore().length + 1}`,
      },
    ]);

    const newIndex = this.keystoreManager.getKeystore().length;

    if (storageChoice === "p") {
      this.keystoreManager.getKeystore().push({ type: "plaintext", label, mnemonic });
      logger.debug("Mnemonic stored in plaintext.");
    } else {
      const encryptedMnemonic = await this.encryptionService.encryptMnemonic(mnemonic);
      this.keystoreManager
        .getKeystore()
        .push({ type: "encoded", label, mnemonic: encryptedMnemonic });
      logger.debug("Mnemonic stored securely.");
    }

    await this.keystoreManager.writeKeystore();
    return newIndex;
  }

  /**
   * Prompts user to generate or import a mnemonic
   * @private
   * @async
   * @returns {Promise<string>} The mnemonic phrase
   */
  private async promptForMnemonic(): Promise<string> {
    const { userChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "userChoice",
        message: "Generate or import a mnemonic?",
        choices: [
          { name: "Generate a new mnemonic", value: "g" },
          { name: "Insert an existing mnemonic", value: "i" },
        ],
      },
    ]);

    return userChoice === "i" ? await this.importMnemonic() : this.generateMnemonic();
  }

  /**
   * Generates a new BIP-39 mnemonic phrase
   * @returns {string} Generated mnemonic phrase
   */
  generateMnemonic(): string {
    return generateMnemonic();
  }

  /**
   * Prompts user to input an existing mnemonic phrase
   * @private
   * @async
   * @returns {Promise<string>} The imported mnemonic phrase
   */
  private async importMnemonic(): Promise<string> {
    logger.debug("\nPlease enter your mnemonic key one word at a time.");
    const words: string[] = [];

    for (let i = 1; i <= 12; i++) {
      const { word } = await inquirer.prompt([
        {
          type: "input",
          name: "word",
          message: `Enter word ${i} of 12`,
          validate: (input: string) => {
            const normalized = input.toLowerCase().trim();
            return (
              wordlists.english.includes(normalized) ||
              "Invalid word. Please enter a valid BIP-39 mnemonic word."
            );
          },
        },
      ]);
      words.push(word.toLowerCase().trim());
    }

    return words.join(" ");
  }

  /**
   * Deletes a mnemonic from the keystore
   * @async
   * @param {number} index - Index of the mnemonic to delete
   * @throws {Error} If index is invalid or trying to delete default mnemonic
   */
  async deleteMnemonic(index: number): Promise<void> {
    const keystore = this.keystoreManager.getKeystore();
    if (index < 0 || index >= keystore.length) {
      throw new Error("Invalid mnemonic index");
    }

    // Prevent deletion of the default mnemonic
    if (index === 0) {
      throw new Error("Cannot delete the default mnemonic as it serves as a fallback");
    }

    // Remove the mnemonic at the specified index
    keystore.splice(index, 1);

    // If we deleted the active mnemonic, update the active index
    const activeIndex = this.keystoreManager.getActiveIndex();
    if (activeIndex === index) {
      // Set to default mnemonic (index 0) when active is deleted
      this.keystoreManager.setActiveIndex(0);
    } else if (activeIndex > index) {
      // If the active index was after the deleted one, decrement it
      this.keystoreManager.setActiveIndex(activeIndex - 1);
    }

    await this.keystoreManager.writeKeystore();
    logger.debug("Mnemonic deleted successfully.");
  }
}
