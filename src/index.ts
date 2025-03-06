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
 * Simple check if the project might need explicit extensions
 */
async function shouldUseExplicitExtensions(cwd: string): Promise<boolean> {
  try {
    // Quick check for common indicators that explicit extensions are needed
    
    // 1. Check package.json for type: module
    try {
      const packageJsonPath = path.join(cwd, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.type === 'module') {
        return true;
      }
    } catch (packageError) {
      // Ignore errors reading package.json
    }
    
    // 2. Simple check for tsconfig.json moduleResolution
    try {
      const tsconfigPath = path.join(cwd, 'tsconfig.json');
      const tsconfigContent = await readFile(tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);
      
      if (tsconfig.compilerOptions) {
        const options = tsconfig.compilerOptions;
        
        // Check moduleResolution and module settings
        if (options.moduleResolution?.toLowerCase?.() === 'nodenext' || 
            options.moduleResolution?.toLowerCase?.() === 'node16' ||
            options.module?.toLowerCase?.() === 'nodenext' ||
            options.module?.toLowerCase?.() === 'node16') {
          return true;
        }
      }
    } catch (tsconfigError) {
      // Ignore errors reading tsconfig.json
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Detect if the current project is using a monorepo structure
 */
async function detectMonorepo(cwd: string): Promise<boolean> {
  try {
    // Common monorepo config files
    const monorepoConfigs = [
      'lerna.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'nx.json',
      'rush.json'
    ];
    
    // Check if any monorepo config files exist
    for (const config of monorepoConfigs) {
      try {
        await stat(path.join(cwd, config));
        return true;
      } catch (error) {
        // File doesn't exist, continue to next
      }
    }
    
    // Check for common monorepo directories
    const monorepoDirs = ['packages', 'apps', 'libs', 'modules'];
    for (const dir of monorepoDirs) {
      try {
        const dirStats = await stat(path.join(cwd, dir));
        if (dirStats.isDirectory()) {
          return true;
        }
      } catch (error) {
        // Directory doesn't exist, continue to next
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Find UI component directory in a monorepo
 */
async function findUIComponentsInMonorepo(cwd: string): Promise<string | null> {
  try {
    // Common paths in monorepos
    const commonPaths = [
      'packages/ui/src/components/ui',
      'packages/ui/components/ui',
      'packages/ui/src/ui',
      'packages/ui/ui',
      'packages/components/src/ui',
      'packages/components/ui',
      'packages/design-system/src/components/ui',
      'packages/design-system/components/ui',
      'libs/ui/src/components/ui',
      'libs/ui/components/ui'
    ];
    
    // Check if any of these paths exist
    for (const relativePath of commonPaths) {
      const fullPath = path.join(cwd, relativePath);
      try {
        const pathStats = await stat(fullPath);
        if (pathStats.isDirectory()) {
          return fullPath;
        }
      } catch (error) {
        // Path doesn't exist, continue to next
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Log a message with a timestamp and styling
 */
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'highlight' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const timestampFormatted = chalk.gray(`[${timestamp}]`);
  
  let formattedMessage;
  switch (type) {
    case 'success':
      formattedMessage = chalk.green('\u2713 ' + message);
      break;
    case 'warning':
      formattedMessage = chalk.yellow('\u26a0 ' + message);
      break;
    case 'error':
      formattedMessage = chalk.red('\u2717 ' + message);
      break;
    case 'highlight':
      formattedMessage = chalk.cyan('\u2192 ' + message);
      break;
    default:
      formattedMessage = chalk.blue('\u2139 ' + message);
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
  
  // Detect if we're in a monorepo
  const cwd = process.cwd();
  const isMonorepo = await detectMonorepo(cwd);
  
  // Check if explicit extensions are needed
  const useExplicitExtensions = fullConfig.forceExplicitExtensions || await shouldUseExplicitExtensions(cwd);
  if (useExplicitExtensions) {
    if (fullConfig.forceExplicitExtensions) {
      log('Using actual file extensions in imports (--force-extensions flag)', 'highlight');
    } else if (useExplicitExtensions) {
      log('Detected ESM project, converting extensions to .js', 'highlight');
    }
    
    if (fullConfig.extensionOverride) {
      log(`Using override extension: ${chalk.bold(fullConfig.extensionOverride)} for all imports`, 'highlight');
    } else {
      log(`Converting .tsx/.ts extensions to .js in imports (auto-detected)`, 'highlight');
    }
  }
  
  // Resolve full path to the components directory
  let componentsDir = path.resolve(cwd, fullConfig.componentsDir);
  
  // If we're in a monorepo, try to find UI components in standard locations
  if (isMonorepo) {
    const monorepoUIPath = await findUIComponentsInMonorepo(cwd);
    if (monorepoUIPath) {
      componentsDir = monorepoUIPath;
      if (fullConfig.verbose) {
        log(`Detected monorepo structure, using UI components at: ${chalk.bold(componentsDir)}`, 'highlight');
      }
    }
  }
  
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
        console.log('  ' + chalk.gray('\u2022') + ' ' + file);
      });
      console.log('');
    }
    
    // Process each component file
    const componentExports = new Map<string, string[]>();
    const fileExtensions = new Map<string, string>(); // Store file extensions
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
      // Store the file extension for later use in imports
      fileExtensions.set(componentName, path.extname(file));
      
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
      
      // Get the file extension if needed for explicit imports
      // In TypeScript, .tsx extensions can't be used in imports unless allowImportingTsExtensions is enabled
      let extension = '';
      
      if (useExplicitExtensions) {
        if (fullConfig.extensionOverride) {
          // Use the override extension if provided
          extension = fullConfig.extensionOverride.startsWith('.') 
            ? fullConfig.extensionOverride 
            : '.' + fullConfig.extensionOverride;
        } else if (fullConfig.forceExplicitExtensions) {
          // If force-extensions flag is used, use the actual source extension
          extension = fileExtensions.get(componentName) || '';
        } else {
          // Default auto-detected behavior for ESM: convert to .js
          const originalExtension = fileExtensions.get(componentName) || '';
          if (originalExtension === '.tsx' || originalExtension === '.ts') {
            extension = '.js'; // Convert to .js for compatibility
          } else {
            extension = originalExtension;
          }
        }
      }
      
      if (exports.length <= fullConfig.singleLineThreshold) {
        // Short export on a single line
        indexContent += `export { ${exports.join(', ')} } from "./${componentName}${extension}";\n`;
      } else {
        // Longer export with line breaks
        indexContent += `export {\n  ${exports.join(',\n  ')}\n} from "./${componentName}${extension}";\n`;
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
