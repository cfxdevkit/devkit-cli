import { Config } from "@xcfx/node";
import { CoreClient } from "../clients/core.js";
import { EspaceClient } from "../clients/espace.js";
import { createLogger } from "../utils/logger.js";
import { Block as EspaceBlock, Transaction as EspaceTransaction } from "../types/espace.js";
import { Block as CoreBlock, Transaction as CoreTransaction } from "../types/core.js";
import { ServerManager } from "../server/server.js";
const logger = createLogger("transaction-monitor");

/**
 * Monitors transactions and blocks across both Core Space and eSpace
 * @class TransactionMonitor
 */
export class TransactionMonitor {
  private coreClient!: CoreClient;
  private espaceClient!: EspaceClient;
  private unwatch: (() => void) | undefined;
  private isMonitoring: boolean = false;
  private server!: ServerManager;

  /**
   * Initializes blockchain clients
   * @param {Config} cfg - Node configuration
   */
  public initializeClients(cfg: Config, server: ServerManager) {
    this.coreClient = new CoreClient(cfg);
    this.espaceClient = new EspaceClient(cfg);
    this.server = server;
  }

  /**
   * Handles Core Space block updates
   * @private
   */
  private handleCoreBlock(block: CoreBlock) {
    console.log(
      "Raw Core Block:",
      JSON.stringify(block, (_, value) => (typeof value === "bigint" ? value.toString() : value))
    );
  }

  /**
   * Handles eSpace block updates
   * @private
   */
  private handleEspaceBlock(block: EspaceBlock) {
    console.log(
      "Raw eSpace Block:",
      JSON.stringify(block, (_, value) => (typeof value === "bigint" ? value.toString() : value))
    );
  }

  /**
   * Handles Core Space transactions
   * @private
   */
  private handleCoreTransaction(tx: CoreTransaction) {
    console.log(
      "Raw Core Transaction:",
      JSON.stringify(tx, (_, value) => (typeof value === "bigint" ? value.toString() : value))
    );
  }

  /**
   * Handles eSpace transactions
   * @private
   */
  private handleEspaceTransaction(tx: EspaceTransaction) {
    console.log(
      "Raw eSpace Transaction:",
      JSON.stringify(tx, (_, value) => (typeof value === "bigint" ? value.toString() : value))
    );
  }

  /**
   * Starts watching for transactions on both networks
   * @throws {Error} If clients are not initialized
   */
  public watchTransactions(): void {
    if (!this.coreClient || !this.espaceClient) {
      throw new Error("Clients are not initialized");
    }

    // Set up transaction watching
    // const coreUnwatch = this.coreClient.watchTx(
    //   async (block) => {
    //     console.log('Raw Core Block:', JSON.stringify(block, (_, v) =>
    //       typeof v === 'bigint' ? v.toString() : v
    //     ));
    //   },
    //   async (tx) => {
    //     console.log('Raw Core Transaction:', JSON.stringify(tx, (_, v) =>
    //       typeof v === 'bigint' ? v.toString() : v
    //     ));
    //   }
    // );

    const espaceUnwatch = this.espaceClient.watchTx(
      async (_block) => {
        console.log();
      },
      async (_tx) => {
        console.log();
      }
    );

    this.unwatch = () => {
      // coreUnwatch();
      espaceUnwatch();
    };
  }

  /**
   * Starts monitoring transactions
   * @async
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log("Starting transaction monitor...");

    // Set up graceful shutdown handler before starting monitoring
    const cleanup = async () => {
      console.log("\nInitiating graceful shutdown...");
      this.stopMonitoring();
      await this.server.stopServer();
      console.log("Shutdown complete.");
      process.exit(0);
    };

    // Handle various termination signals
    process.on("SIGINT", cleanup); // Ctrl+C
    process.on("SIGTERM", cleanup); // Kill command
    process.on("SIGUSR2", cleanup); // Nodemon restart

    try {
      this.watchTransactions();
      // Keep the process alive
      while (this.isMonitoring) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error("Error monitoring transactions:", error);
      await cleanup();
    }
  }

  /**
   * Stops monitoring transactions
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return; // Already stopped
    }

    console.log("\nStopping transaction monitor...");
    this.isMonitoring = false;

    if (this.unwatch) {
      try {
        this.unwatch();
        this.unwatch = undefined;
      } catch (error) {
        logger.error("Error during unwatch:", error);
      }
    }
  }
}
