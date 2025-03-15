import { Command } from "commander";
import { loadConfig } from "./config.js";
import { Wallet } from "../wallet/wallet.js";
import { ServerManager } from "../server/server.js";
// import { TransactionMonitor } from "../monitor/transaction-monitor.js";
import { CoreClient } from "../clients/core.js";
export function createStartCommand(): Command {
  const startCommand = new Command("start")
    .description("Start the Conflux development node")
    .action(async () => {
      try {
        const config = await loadConfig();
        const wallet = new Wallet();
        await wallet.initializeKeystore();
        const server = new ServerManager(wallet, config);

        console.log("Starting Conflux development node...");
        await server.startServer();
        // const monitor = new TransactionMonitor();
        // monitor.initializeClients(config, server);
        // await monitor.startMonitoring();
        // Add delay before first stop
        const coreClient = new CoreClient(config);
        await coreClient.testClient.mine({ blocks: 20 });

        console.log(
          "latest_state Block number:",
          (
            await coreClient.publicClient.getBlock({
              epochTag: "latest_state",
            })
          ).blockNumber
        );

        console.log("Stopping server for first time...");
        await server.stopServer();

        await server.startServer();
        console.log("Server restarted...");
        await coreClient.testClient.mine({ blocks: 20 });
        console.log(
          "latest_state Block number:",
          (
            await coreClient.publicClient.getBlock({
              epochTag: "latest_state",
            })
          ).blockNumber
        );

        console.log("Stopping server for second time...");
        await server.stopServer();

        await server.startServer();
        console.log("Server restarted...");

        await coreClient.testClient.mine({ blocks: 20 });

        console.log(
          "latest_state Block number:",
          (
            await coreClient.publicClient.getBlock({
              epochTag: "latest_state",
            })
          ).blockNumber
        );

        console.log("Stopping server for third time...");
        await server.stopServer();

        console.log("Node start/stop cycle completed successfully!");
        console.log("Press Ctrl+C to stop the node");
      } catch (error) {
        console.error("Failed to start node:", error);
        process.exit(1);
      }
    });

  return startCommand;
}
