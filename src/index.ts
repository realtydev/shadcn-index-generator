import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as util from 'util';
import chalk from 'chalk';
import { Config } from './config.js';
import { FileSystemError } from './types.js';

// Promisified file system functions
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

/**
 * Log a message with a timestamp and styling
 */
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'highlight' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const timestampFormatted = chalk.gray(`[${timestamp}]`);
  
  let formattedMessage;
  switch (type) {
    case 'success':
      formattedMessage = chalk.green('✓ ' + message);
      break;
    case 'warning':
      formattedMessage = chalk.yellow('⚠ ' + message);
      break;
    case 'error':
      formattedMessage = chalk.red('✗ ' + message);
      break;
    case 'highlight':
      formattedMessage = chalk.cyan('→ ' + message);
      break;
    default:
      formattedMessage = chalk.blue('ℹ ' + message);
  }
  
  console.log(`${timestampFormatted} ${formattedMessage}`);
}

/**
 * Extract exports from a TypeScript source file
 */
function extractExports(sourceFile: ts.SourceFile): { exports: string[], typeExports: string[] } {
  const exports: string[] = [];
  const typeExports: string[] = [];

  // Function to visit each node and find exports
  function visit(node: ts.Node) {
    // Export declarations like: export { Button, Card }
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          if (element.isTypeOnly) {
            typeExports.push(element.name.text);
          } else {
            exports.push(element.name.text);
          }
        }
      }
    }
    // Export assignments like: export const Button = ...
    else if (ts.isVariableStatement(node) &&
             node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const name = declaration.name.text;
          exports.push(name);
        }
      }
    }
    // Export type aliases like: export type ButtonProps = ...
    else if (ts.isTypeAliasDeclaration(node) &&
             node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isIdentifier(node.name)) {
        const name = node.name.text;
        typeExports.push(name);
      }
    }
    // Export interfaces like: export interface ButtonProps { ... }
    else if (ts.isInterfaceDeclaration(node) &&
             node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isIdentifier(node.name)) {
        const name = node.name.text;
        typeExports.push(name);
      }
    }
    // Export functions like: export function Button() { ... }
    else if (ts.isFunctionDeclaration(node) &&
             node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) &&
             node.name) {
      exports.push(node.name.text);
    }
    // Default exports like: export default Button
    else if (ts.isExportAssignment(node) && !node.isExportEquals) {
      if (ts.isIdentifier(node.expression)) {
        exports.push(node.expression.text);
      } else if (node.expression.kind === ts.SyntaxKind.FunctionExpression ||
                 node.expression.kind === ts.SyntaxKind.ArrowFunction) {
        exports.push('default');
      }
    }

    // Continue traversing the tree
    ts.forEachChild(node, visit);
  }

  // Start the traversal
  visit(sourceFile);

  return { exports, typeExports };
}

/**
 * Check if a name should be treated as a type based on patterns
 */
function shouldBeType(name: string, typePatterns: RegExp[]): boolean {
  return typePatterns.some(pattern => pattern.test(name));
}

/**
 * Main function to generate the index file
 */
export async function generateIndex(config: Partial<Config> = {}): Promise<void> {
  // Import the default config if not available in this context
  const defaultConfig = (await import('./config.js')).defaultConfig;

  // Merge with default config
  const fullConfig = { ...defaultConfig, ...config } as Config;

  // Resolve full path to the components directory
  const componentsDir = path.resolve(process.cwd(), fullConfig.componentsDir);
  const outputFile = path.join(componentsDir, fullConfig.outputFile);

  try {
    // Check if the directory exists
    try {
      await stat(componentsDir);
    } catch (error: unknown) {
      const fsError = error as FileSystemError;
      if (fsError.code === 'ENOENT') {
        log(`Directory not found: ${chalk.bold(componentsDir)}`, 'error');
        log('Please check the path and try again', 'warning');
        return; // Exit gracefully
      }
      // If it's another kind of error, rethrow it
      throw fsError;
    }

    // Print a nice banner
    console.log(chalk.cyan('====================================='));
    console.log(chalk.bold.cyan(' ShadCN UI Index Generator'));
    console.log(chalk.cyan('====================================='));

    log(`Starting index generation for UI components`, 'info');

    log(`Scanning directory: ${chalk.bold(componentsDir)}`, 'info');

    // Get all files in the directory
    const files = await readdir(componentsDir);

    // Filter files based on include/exclude patterns
    const componentFiles = files.filter(file => {
      return fullConfig.include.test(file) &&
             !fullConfig.exclude.some((pattern: RegExp) => pattern.test(file));
    });

    log(`Found ${chalk.bold(componentFiles.length)} component files`, 'highlight');

    if (fullConfig.verbose) {
      log('Component files found:', 'info');
      componentFiles.forEach(file => {
        console.log('  ' + chalk.gray('•') + ' ' + file);
      });
      console.log('');
    }

    // Process each component file
    const componentExports = new Map<string, string[]>();
    let processedCount = 0;
    let typesDetectedCount = 0;
    const startTime = performance.now();

    log('Processing component files...', 'info');

    // Add a progress tracker
    const updateProgress = () => {
      processedCount++;
      if (fullConfig.verbose) {
        const percent = Math.floor((processedCount / componentFiles.length) * 100);
        process.stdout.write(`\r  ${chalk.gray('Progress:')} ${chalk.cyan(`${percent}%`)} [${processedCount}/${componentFiles.length}]`);
      }
    };

    for (const file of componentFiles) {
      const filePath = path.join(componentsDir, file);
      const componentName = path.basename(file, path.extname(file));

      try {
        // Read the file content
        const sourceText = await readFile(filePath, 'utf8');

        // Parse the source file
        const sourceFile = ts.createSourceFile(
          file,
          sourceText,
          ts.ScriptTarget.Latest,
          true
        );

        // Extract exports from the file
        const { exports, typeExports } = extractExports(sourceFile);

        // Check for value exports that should be type exports
        const finalExports: string[] = [];
        const finalTypeExports: string[] = [...typeExports];

        for (const name of exports) {
          if (shouldBeType(name, fullConfig.typePatterns)) {
            if (fullConfig.verbose) {
              log(`Marking "${chalk.bold(name)}" in ${file} as a type export`, 'highlight');
            }
            finalTypeExports.push(name);
            typesDetectedCount++;
          } else {
            finalExports.push(name);
          }
        }

        // Combine all exports, with 'type' prefix for type exports
        const allExports = [
          ...finalExports,
          ...finalTypeExports.map(name => `type ${name}`)
        ];

        if (allExports.length > 0) {
          componentExports.set(componentName, allExports);
        }

        // Update progress
        updateProgress();
      } catch (error: unknown) {
        const fsError = error as FileSystemError;
        console.warn(chalk.yellow(`Warning: Could not process file ${file}:`), error);
        updateProgress();
      }
    }

    // Clear the progress indicator if verbose
    if (fullConfig.verbose) {
      process.stdout.write('\n');
    }
    
    // Calculate processing time
    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`Processed ${chalk.bold(componentFiles.length)} files in ${chalk.bold(processingTime)}s`, 'success');
    log(`Detected ${chalk.bold(typesDetectedCount)} type exports that need the 'type' keyword`, 'highlight');
    
    // Generate index.ts content
    log('Generating index.ts content...', 'info');
    let indexContent = fullConfig.headerComment;

    // Get component names (sorted or not)
    let componentNames = Array.from(componentExports.keys());
    if (fullConfig.sortAlphabetically) {
      componentNames.sort();
    }

    // Generate export statements
    for (const componentName of componentNames) {
      const exports = componentExports.get(componentName)!;

      if (exports.length <= fullConfig.singleLineThreshold) {
        // Short export on a single line
        indexContent += `export { ${exports.join(', ')} } from "./${componentName}";\n`;
      } else {
        // Longer export with line breaks
        indexContent += `export {\n  ${exports.join(',\n  ')}\n} from "./${componentName}";\n`;
      }
    }

    // Write the index.ts file (or just display in dry run mode)
    if (fullConfig.dryRun) {
      log('Dry run - index.ts would contain:', 'highlight');
      console.log(chalk.gray('---------------------------------------------------'));
      console.log(indexContent);
      console.log(chalk.gray('---------------------------------------------------'));
      log('No files were modified (dry run mode)', 'info');
    } else {
      await writeFile(outputFile, indexContent);
      
      // Calculate file size
      const fileSizeBytes = Buffer.byteLength(indexContent, 'utf8');
      const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);
      
      log(`Generated ${chalk.bold(outputFile)} (${chalk.bold(fileSizeKB + 'KB')})`, 'success');
      log(`File contains ${chalk.bold(componentExports.size)} component exports`, 'success');
    }
  } catch (error: unknown) {
    const fsError = error as FileSystemError;
    
    // Print more user-friendly error message
    if (fsError.code) {
      switch (fsError.code) {
        case 'EACCES':
          log(`Permission denied: Cannot access ${chalk.bold(fsError.path)}`, 'error');
          log('Try running with elevated permissions', 'warning');
          break;
        case 'ENAMETOOLONG':
          log(`Path too long: ${chalk.bold(fsError.path)}`, 'error');
          break;
        default:
          log(`Operation failed: ${fsError.message}`, 'error');
      }
    } else {
      log(`Unexpected error: ${fsError.message}`, 'error');
    }
    
    if (fullConfig.verbose) {
      console.error(chalk.gray('\nDetailed error information:'), error);
    } else {
      log('Run with --verbose for more details', 'info');
    }
    
    // Don't rethrow, instead exit the process with error code
    process.exitCode = 1;
  } finally {
    // Print summary footer
    console.log(chalk.cyan('====================================='));
    log('Generation complete!', 'success');
    console.log(chalk.cyan('====================================='));
  }
}
