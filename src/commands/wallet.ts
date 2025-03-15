import { Command } from "commander";
import { Wallet } from "../wallet/wallet.js";
import { createLogger } from "../utils/logger.js";
import { loadConfig } from "../commands/config.js";

const logger = createLogger("wallet-cmd");

export function createWalletCommands(): Command {
  logger.debug("Creating wallet commands");
  const wallet = new Wallet();
  const walletCommand = new Command("wallet")
    .description("Configure a local HDWallet")
    .action(() => {
      // Add a default action for just 'wallet' command
      walletCommand.help();
    });

  walletCommand
    .command("add")
    .description("Generate or insert a new mnemonic in the keystore")
    .action(async () => {
      try {
        await wallet.initializeKeystore();
        await wallet.addMnemonic();
      } catch (error) {
        logger.error("Failed to add mnemonic:", error);
        process.exit(1);
      }
    });

  walletCommand
    .command("delete")
    .description("Delete a mnemonic from the keystore (except default)")
    .action(async () => {
      try {
        await wallet.initializeKeystore();
        await wallet.deleteMnemonic();
      } catch (error) {
        logger.error("Failed to delete mnemonic:", error);
        process.exit(1);
      }
    });

  walletCommand
    .command("select")
    .description("Select the currently active mnemonic")
    .action(async () => {
      try {
        await wallet.initializeKeystore();
        await wallet.selectActiveMnemonic();
      } catch (error) {
        logger.error("Failed to select mnemonic:", error);
        process.exit(1);
      }
    });

  walletCommand
    .command("show")
    .description("Print to screen the currently active mnemonic")
    .action(async () => {
      try {
        logger.debug("Initializing wallet...");
        await wallet.initializeKeystore();

        logger.debug("Getting active mnemonic...");
        const mnemonic = await wallet.getActiveMnemonic();

        // Only output the mnemonic to stdout for clean piping
        process.stdout.write(mnemonic + "\n");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to show mnemonic: ${errMsg}`);

        // Print a user-friendly error message to stderr
        console.error("\nError: Failed to show mnemonic");
        console.error("Reason:", errMsg);
        console.error("\nPlease check if:");
        console.error("1. You have proper permissions to access the keystore file");
        console.error("2. The keystore file is not corrupted");
        console.error("3. There is an active mnemonic selected");

        process.exit(1);
      }
    });

  walletCommand
    .command("private-key [index]")
    .description("Manage private keys")
    .option("--derivation-path <path>", "Derivation path for the private key")
    .option("--core", "Use the core network")
    .action(async (index, options) => {
      try {
        logger.debug("Executing private-key command", { index, options });
        await wallet.initializeKeystore();
        const derivationIndex = index ? parseInt(index, 10) : 0;

        // Debug info to stderr
        logger.debug(`Index: ${derivationIndex}, Core: ${options.core ? "yes" : "no"}`);

        let key: string;
        if (options.derivationPath) {
          key = await wallet.privateKeyByDerivationPath(options.derivationPath);
        } else if (options.core) {
          key = await wallet.corePrivateKey(derivationIndex);
        } else {
          key = await wallet.espacePrivateKey(derivationIndex);
        }
        // Clean output to stdout
        process.stdout.write(key + "\n");
      } catch (error) {
        logger.error("Failed to get private key:", error);
        process.exit(1);
      }
    });

  walletCommand
    .command("address [index]")
    .description("Get wallet addresses")
    .option("--core", "Use the core network")
    .option("--network-id <id>", "Custom network ID for address generation")
    .action(async (index, options) => {
      try {
        logger.debug("Executing address command", { index, options });
        await wallet.initializeKeystore();
        const derivationIndex = index ? parseInt(index, 10) : 0;

        // Get network ID from options or config
        let networkId: number;
        if (options.networkId) {
          networkId = parseInt(options.networkId, 10);
        } else {
          const config = await loadConfig();
          if (!config.chainId) {
            throw new Error("Chain ID is required");
          }
          networkId = config.chainId;
        }

        // Debug info to stderr
        logger.debug(
          `Index: ${derivationIndex}, Core: ${options.core ? "yes" : "no"}, NetworkID: ${networkId}`
        );

        let address: string;
        if (options.core) {
          address = await wallet.coreAddress(derivationIndex, networkId);
        } else {
          address = await wallet.espaceAddress(derivationIndex);
        }
        // Clean output to stdout
        process.stdout.write(address + "\n");
      } catch (error) {
        logger.error("Failed to get address:", error);
        process.exit(1);
      }
    });

  logger.debug("Wallet commands created");
  return walletCommand;
}
