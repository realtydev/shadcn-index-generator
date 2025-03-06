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
```

### In package.json scripts

```json
{
  "scripts": {
    "generate-ui-index": "shadcn-index-generator"
  }
}
```

### One-off usage with npx

```bash
npx shadcn-index-generator@latest
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `directory` | Path to UI components directory | `src/components/ui` |
| `-o, --output <filename>` | Output filename | `index.ts` |
| `--no-sort` | Do not sort components alphabetically | (sorts by default) |
| `-t, --single-line-threshold <number>` | Maximum exports for single-line format | `3` |
| `-v, --verbose` | Show verbose output | `false` |
| `--dry-run` | Show what would be generated without writing to file | `false` |
| `--version` | Show version number | - |
| `--help` | Show help | - |

## API Usage

You can also use the generator programmatically:

```typescript
import { generateIndex } from 'shadcn-index-generator';

// Use default settings
await generateIndex();

// With custom options
await generateIndex({
  componentsDir: 'lib/ui',
  outputFile: 'exports.ts',
  singleLineThreshold: 5,
  sortAlphabetically: false,
  verbose: true
});
```

## Why this tool?

When working with shadcn/ui components in TypeScript projects with `isolatedModules` enabled, you need to properly mark type exports with the `type` keyword. This tool automatically:

1. Scans your component files
2. Detects both value and type exports
3. Properly marks type exports with the `type` keyword
4. Generates a clean, formatted index.ts file

This prevents TypeScript errors like:

```
Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.ts(1205)
```

## Type Detection

The tool automatically detects common type patterns in UI components:

- Names ending with `Api` (like `CarouselApi`)
- Names ending with `Props` (like `ButtonProps`)
- Names ending with `Config` (like `ChartConfig`)
- Names starting with `Use` (like `UseFormField`)
- Names ending with `Context`, `Provider`, `Store`, etc.

## Error Handling

The tool includes friendly error handling for common issues:

- Directory not found
- Permission errors
- Path too long errors
- Other file system issues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
