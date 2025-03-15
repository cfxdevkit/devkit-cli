#!/usr/bin/env node

import { Command } from "commander";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createLogger } from "./utils/logger.js";
import { createWalletCommands } from "./commands/wallet.js";
import { createConfigCommands } from "./commands/config.js";
import { createStartCommand } from "./commands/start.js";

const cliLogger = createLogger("cli");

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let packageVersion = "0.1.0";

try {
  const packageJson = JSON.parse(
    await fs.readFile(new URL("../package.json", import.meta.url), "utf8")
  );
  packageVersion = packageJson.version;
} catch (error) {
  cliLogger.warn("Could not read package.json version", error);
}

process.on("uncaughtException", (err) => {
  cliLogger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  cliLogger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

export class DevkitCLI {
  private program: Command;

  constructor() {
    cliLogger.debug("Initializing DevkitCLI");
    this.program = new Command()
      .name("devkit")
      .version(packageVersion)
      .description("CLI tool for Conflux development tasks");

    this.initializeCommands();
  }

  private initializeCommands() {
    cliLogger.debug("Setting up commands");

    // Add start command
    const startCommand = createStartCommand();
    this.program.addCommand(startCommand);
    cliLogger.debug("Added start command");

    // Add wallet commands
    const walletCommands = createWalletCommands();
    this.program.addCommand(walletCommands);
    cliLogger.debug("Added wallet commands");

    // Add config commands
    const configCommands = createConfigCommands();
    this.program.addCommand(configCommands);
    cliLogger.debug("Added config commands");
  }

  public async run(args: string[] = process.argv) {
    try {
      cliLogger.debug("Running CLI with args:", args);
      await this.program.parseAsync(args);
    } catch (error) {
      cliLogger.error("Error parsing arguments:", error);
      process.exit(1);
    }
  }
}

// Run the CLI
if (import.meta.url.startsWith("file:")) {
  cliLogger.debug("Starting CLI");
  const cli = new DevkitCLI();
  await cli.run();
}
