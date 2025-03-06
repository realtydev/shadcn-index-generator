#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

// Determine the path to the CLI script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = resolve(__dirname, 'cli.js');

// Execute the CLI script with the same arguments
const proc = spawn('node', [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

// Handle process events
proc.on('close', code => {
  process.exit(code || 0);
});

proc.on('error', err => {
  console.error('Failed to execute command:', err);
  process.exit(1);
});
