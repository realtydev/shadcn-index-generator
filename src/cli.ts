#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { generateIndex } from './index.js';
import { defaultConfig } from './config.js';
// Read version from package.json
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = resolve(__dirname, '../package.json');
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Create command line interface
const program = new Command();

program
  .name('shadcn-index-generator')
  .description('Generate index.ts files for shadcn/ui components with proper type exports')
  .version(version)
  .argument('[directory]', 'Directory containing UI components')
  .option('-o, --output <filename>', 'Output filename', defaultConfig.outputFile)
  .option('--no-sort', 'Do not sort components alphabetically')
  .option('-t, --single-line-threshold <number>', 'Maximum exports for single-line format', String(defaultConfig.singleLineThreshold))
  .option('-v, --verbose', 'Show verbose output')
  .option('--dry-run', 'Show what would be generated without writing to file')
  .option('--force-extensions', 'Force explicit file extensions in imports')
  .option('--ext <extension>', 'Override file extension to use for imports (e.g., .js, .jsx)')
  .action(async (directory, options) => {
    try {
      // Set up configuration from command line options
      const config = {
        ...defaultConfig,
        componentsDir: directory || defaultConfig.componentsDir,
        outputFile: options.output,
        sortAlphabetically: options.sort !== false,
        singleLineThreshold: parseInt(options.singleLineThreshold, 10),
        verbose: options.verbose || false,
        dryRun: options.dryRun || false,
        forceExplicitExtensions: options.forceExtensions || false,
        extensionOverride: options.ext || ''
      };

      // Run the generator
      await generateIndex(config);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
