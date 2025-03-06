# shadcn-index-generator

Generate index.ts files for shadcn/ui components with proper type exports.

## Features

- 🔄 Automatically generates index.ts files for shadcn/ui components
- 🔍 Detects exports from TypeScript/React component files
- ✅ Handles type exports correctly with the `type` keyword (essential for `isolatedModules`)
- 🧩 Smart detection of common UI component patterns
- 🔧 Fully configurable through command line options or API
- 🎨 Beautiful formatting with proper indentation

## Installation

### Global Installation

```bash
npm install -g shadcn-index-generator
```

### Local Installation

```bash
npm install --save-dev shadcn-index-generator
```

## Usage

### As a CLI

```bash
# Run with default settings (scans src/components/ui)
npx shadcn-index-generator

# Specify a custom directory
npx shadcn-index-generator path/to/components

# With options
npx shadcn-index-generator --output exports.ts --no-sort --single-line-threshold 5 --verbose

# Keep original file extensions (.tsx, .ts)
npx shadcn-index-generator --force-extensions

# Override with specific extension
npx shadcn-index-generator --ext .jsx
```

### In package.json scripts

```json
{
  "scripts": {
    "generate-ui-index": "shadcn-index-generator"
  }
}
```

## Options

| Option                                 | Description                                          | Default             |
| -------------------------------------- | ---------------------------------------------------- | ------------------- |
| `directory`                            | Path to UI components directory                      | `src/components/ui` |
| `-o, --output <filename>`              | Output filename                                      | `index.ts`          |
| `--no-sort`                            | Do not sort components alphabetically                | (sorts by default)  |
| `-t, --single-line-threshold <number>` | Maximum exports for single-line format               | `3`                 |
| `-v, --verbose`                        | Show verbose output                                  | `false`             |
| `--dry-run`                            | Show what would be generated without writing to file | `false`             |
| `--force-extensions`                   | Use actual file extensions in imports (.tsx, .ts)    | `false`             |
| `--ext <extension>`                    | Override file extension to use for all imports       | `none`              |
| `--version`                            | Show version number                                  | -                   |
| `--help`                               | Show help                                            | -                   |

## Extension Handling

The tool has three modes for handling file extensions in imports:

1. **Auto-detection** (default):

   - For ESM/NodeNext projects, `.tsx` and `.ts` extensions are converted to `.js`
   - For CommonJS projects, no extensions are used

2. **Force Actual Extensions** (`--force-extensions`):

   - Uses actual source file extensions (`.tsx`, `.ts`) in imports
   - Useful when your TypeScript config has `allowImportingTsExtensions: true`

3. **Override Extensions** (`--ext`):
   - Forces a specific extension for all imports, regardless of source file type
   - Example: `--ext .jsx` to make all imports use `.jsx` extension

## Fixing TypeScript Module Resolution Errors

If you're seeing errors like:

```
Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.
```

This happens in TypeScript projects that use ESM modules. In most cases, the default auto-detection will handle this correctly by converting `.tsx` and `.ts` extensions to `.js` in the imports.

If you're still having issues, try:

```bash
# For most TypeScript ESM projects (converts to .js)
npx shadcn-index-generator

# If you need explicit control over extensions
npx shadcn-index-generator --ext .js
```

## API Usage

You can also use the generator programmatically:

```typescript
import { generateIndex } from "shadcn-index-generator";

// Use default settings
await generateIndex();

// With custom options
await generateIndex({
  componentsDir: "lib/ui",
  outputFile: "exports.ts",
  singleLineThreshold: 5,
  sortAlphabetically: false,
  verbose: true,
  forceExplicitExtensions: true, // Use actual source extensions
  extensionOverride: ".jsx", // Override with specific extension
});
```

## License

MIT
