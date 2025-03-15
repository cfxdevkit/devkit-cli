/**
 * Encryption service module for secure mnemonic storage
 * @module EncryptionService
 */

import { webcrypto } from "node:crypto";
import inquirer from "inquirer";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("encryption-service");
const crypto = webcrypto as unknown as Crypto;

/**
 * Service for encrypting and decrypting sensitive wallet data
 * @class EncryptionService
 */
export class EncryptionService {
  /**
   * Derives an encryption key from a password using PBKDF2
   * @async
   * @param {string} reason - Prompt message explaining why the password is needed
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>} Derived encryption key
   */
  async deriveKeyFromPassword(reason: string, salt: Uint8Array): Promise<CryptoKey> {
    const { password } = await inquirer.prompt([
      {
        type: "password",
        name: "password",
        message: reason,
      },
    ]);

    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100_000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Generates cryptographically secure random values
   * @param {Uint8Array} array - Array to fill with random values
   * @returns {Uint8Array} Array filled with random values
   */
  getRandomValues(array: Uint8Array): Uint8Array {
    return crypto.getRandomValues(array);
  }

  /**
   * Encrypts a mnemonic phrase using AES-GCM
   * @async
   * @param {string} mnemonic - Mnemonic phrase to encrypt
   * @returns {Promise<string>} Base64 encoded encrypted data
   */
  async encryptMnemonic(mnemonic: string): Promise<string> {
    const iv = this.getRandomValues(new Uint8Array(12));
    const salt = this.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKeyFromPassword(
      "Enter encryption password to secure your mnemonic.",
      salt
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(mnemonic)
    );
    const encryptedData = new Uint8Array([...salt, ...iv, ...new Uint8Array(encrypted)]);
    return Buffer.from(encryptedData).toString("base64");
  }

  /**
   * Decrypts an encrypted mnemonic phrase
   * @async
   * @param {string} encryptedMnemonic - Base64 encoded encrypted mnemonic
   * @returns {Promise<string>} Decrypted mnemonic phrase
   * @throws {Error} If decryption fails after maximum attempts
   */
  async decryptMnemonic(encryptedMnemonic: string): Promise<string> {
    const encryptedBytes = Buffer.from(encryptedMnemonic, "base64");
    const salt = encryptedBytes.subarray(0, 16);
    const iv = encryptedBytes.subarray(16, 28);
    const data = encryptedBytes.subarray(28);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const key = await this.deriveKeyFromPassword("Enter password to decrypt mnemonic:", salt);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
        return new TextDecoder().decode(decrypted);
      } catch (error) {
        const _ = error;
        logger.error(`Decryption failed (${attempt}/3). Incorrect password or corrupted data.`);
      }
    }
    throw new Error("Maximum decryption attempts reached.");
  }
}
