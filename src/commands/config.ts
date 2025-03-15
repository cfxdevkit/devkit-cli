import { Command } from "commander";
import { createLogger } from "../utils/logger.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import { Config } from "@xcfx/node";
const logger = createLogger("config-cmd");
const CONFIG_FILE = path.join(process.env.HOME || "", ".devkit.config.json");

const defaultConfig: Config = {
  posReferenceEnableHeight: 0,
  jsonrpcHttpPort: 12537,
  jsonrpcWsPort: 12535,
  jsonrpcHttpEthPort: 8545,
  jsonrpcWsEthPort: 8546,
  chainId: 2029,
  evmChainId: 2030,
  nodeType: "full",
  blockDbType: "sqlite",
  log: false,
  logLevel: "error",
};

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    return data.trim() ? JSON.parse(data) : defaultConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultConfig;
    }
    throw error;
  }
}

async function saveConfig(config: Config): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function createConfigCommands(): Command {
  logger.debug("Creating config commands");
  const configCommand = new Command("config")
    .description("Manage configuration settings")
    .action(() => {
      configCommand.help();
    });

  configCommand
    .command("view")
    .description("View current configuration")
    .action(async () => {
      try {
        const config = await loadConfig();
        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        logger.error("Failed to view configuration:", error);
        process.exit(1);
      }
    });

  configCommand
    .command("update")
    .description("Update configuration")
    .action(async () => {
      try {
        let config = await loadConfig();

        while (true) {
          const { selectedKey } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedKey",
              message: "Select a configuration key to update",
              choices: Object.keys(config),
            },
          ]);

          const currentValue = config[selectedKey as keyof Config];
          const valueType = typeof currentValue;

          const promptConfig: {
            type: string;
            name: string;
            message: string;
            default: string;
            choices?: string[];
            validate?: (value: string) => boolean | string;
          } = {
            type: "input",
            name: "newValue",
            message: `Enter a new value for ${selectedKey} (current: ${currentValue})`,
            default: String(currentValue),
          };

          // Adjust prompt based on value type
          if (valueType === "boolean") {
            promptConfig.type = "list";
            promptConfig.choices = ["true", "false"];
          } else if (valueType === "number") {
            promptConfig.validate = (value: string) => {
              if (isNaN(Number(value))) {
                return "Please enter a valid number.";
              }
              return true;
            };
          }

          const { newValue } = await inquirer.prompt([promptConfig]);

          // Convert value based on type
          let parsedValue;
          if (valueType === "boolean") {
            parsedValue = newValue === "true";
          } else if (valueType === "number") {
            parsedValue = Number(newValue);
          } else {
            parsedValue = newValue;
          }

          config = {
            ...config,
            [selectedKey]: parsedValue,
          };

          logger.debug(`Updated ${selectedKey} to ${parsedValue}`);

          const { continueEditing } = await inquirer.prompt([
            {
              type: "list",
              name: "continueEditing",
              message: "Do you want to edit another key?",
              choices: ["Yes", "No"],
            },
          ]);

          if (continueEditing === "No") {
            break;
          }
        }

        await saveConfig(config);
        logger.debug("Configuration updated successfully");
      } catch (error) {
        logger.error("Failed to update configuration:", error);
        process.exit(1);
      }
    });

  logger.debug("Config commands created");
  return configCommand;
}
