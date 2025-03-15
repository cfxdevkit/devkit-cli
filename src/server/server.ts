import { privateKeyToAccount } from "cive/accounts";
import { Wallet } from "../wallet/wallet.js";
import { CoreClient } from "../clients/core.js";
import { createServer } from "@xcfx/node";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { Config } from "@xcfx/node";

export interface Server {
  startServer(): Promise<void>;
  stopServer(): void;
  getConfig(): Config;
  getMinerWallet(): CoreClient | undefined;
}

/**
 * Manages the development node server lifecycle and configuration
 * @class ServerManager
 */
export class ServerManager implements Server {
  /** The server instance */
  private server: Awaited<ReturnType<typeof createServer>> | null = null;
  /** Server configuration */
  private cfg: Config;
  /** Miner wallet for the node */
  private minerWallet: CoreClient | undefined;
  private wallet: Wallet;

  /**
   * Creates a new server manager instance
   * @constructor
   * @param {Wallet} wallet - Wallet instance for key management
   * @param {Config} config - Server configuration
   */
  constructor(wallet: Wallet, config: Config) {
    this.wallet = wallet;
    this.cfg = config;
  }

  /**
   * Ensures the data directory exists
   * @private
   */
  private async ensureDataDir(): Promise<string> {
    const dataDir = resolve(process.cwd(), this.cfg.confluxDataDir || "./data");
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    return dataDir;
  }

  /**
   * Initializes the blockchain with necessary accounts and configurations
   * @private
   * @throws {Error} If chain initialization fails
   */
  private async initializeChain(): Promise<void> {
    try {
      const length = 10;
      // Generate miner account
      const minerPrivateKey = await this.wallet.corePrivateKey(length + 1);
      const minerAccount = privateKeyToAccount(minerPrivateKey as `0x${string}`, {
        networkId: this.cfg.chainId || 2029,
      });
      if (!minerAccount) {
        throw new Error("Failed to generate miner account");
      }

      // Generate Core private keys
      const corePrivateKeys = await Promise.all(
        Array.from({ length: 10 }, (_, i) => this.wallet.corePrivateKey(i))
      );
      if (!corePrivateKeys || corePrivateKeys.length === 0) {
        throw new Error("Failed to generate core private keys");
      }

      // Generate eSpace private keys
      const evmPrivateKeys = await Promise.all(
        Array.from({ length: 10 }, (_, i) => this.wallet.espacePrivateKey(i))
      );
      if (!evmPrivateKeys || evmPrivateKeys.length === 0) {
        throw new Error("Failed to generate evm private keys");
      }

      // Update config with genesis secrets
      this.cfg.genesisSecrets = [...corePrivateKeys, minerPrivateKey] as `0x${string}`[];
      this.cfg.genesisEvmSecrets = [...evmPrivateKeys, minerPrivateKey] as `0x${string}`[];
      // Set mining author as hex address
      this.cfg.miningAuthor = minerAccount.address;

      // Ensure data directory exists and get absolute path
      const dataDir = await this.ensureDataDir();

      // Create and start node with absolute paths
      const serverConfig = {
        ...this.cfg,
        confluxDataDir: dataDir,
      };
      this.server = await createServer(serverConfig);

      // Initialize miner wallet
      this.minerWallet = new CoreClient(this.cfg, this.cfg.genesisSecrets.length - 1);
    } catch (error) {
      console.error("Failed to initialize chain:", error);
      throw error;
    }
  }

  /**
   * Starts the Conflux Node server
   * @async
   * @throws {Error} If server fails to start
   */
  public async startServer(): Promise<void> {
    try {
      await this.initializeChain();
      if (!this.server) {
        throw new Error("Node not initialized");
      }
      await this.server.start();
    } catch (error) {
      console.error("Failed to start server:", error);
      throw error;
    }
  }

  /**
   * Stops the Conflux Node server
   */
  public async stopServer(): Promise<void> {
    if (this.server) {
      await this.server.stop();
    }
  }

  /**
   * Gets the current server configuration
   * @returns {Config} The current configuration
   */
  public getConfig(): Config {
    return this.cfg;
  }

  /**
   * Gets the miner wallet instance
   * @returns {CoreClient | undefined} The miner wallet or undefined if not initialized
   */
  public getMinerWallet(): CoreClient | undefined {
    return this.minerWallet;
  }
}
