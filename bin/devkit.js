#!/usr/bin/env node

import { DevkitCLI } from '../dist/index.js';

const cli = new DevkitCLI();
await cli.run(); 