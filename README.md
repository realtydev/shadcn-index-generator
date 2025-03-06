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


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
