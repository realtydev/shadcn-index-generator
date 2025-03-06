/**
 * Configuration for the index generator
 */

export interface Config {
  /** Path to UI components directory */
  componentsDir: string;

  /** Output file name */
  outputFile: string;

  /** Whether to sort components alphabetically */
  sortAlphabetically: boolean;

  /** Format for exports with few items (single line vs multi-line) */
  singleLineThreshold: number;

  /** Use 'type' keyword for these patterns */
  typePatterns: RegExp[];

  /** File patterns to include */
  include: RegExp;

  /** Files to exclude */
  exclude: RegExp[];

  /** Header comment for the generated file */
  headerComment: string;

  /** Show verbose output */
  verbose: boolean;

  /** Show what would be generated without writing to file */
  dryRun: boolean;
}

// Default configuration
export const defaultConfig: Config = {
  // Path to UI components (can be overridden by command line args)
  componentsDir: "src/components/ui",

  // Output file name
  outputFile: "index.ts",

  // Whether to sort components alphabetically
  sortAlphabetically: true,

  // Format for exports with few items (single line vs multi-line)
  singleLineThreshold: 3,

  // Use 'type' keyword for these patterns
  typePatterns: [
    /Api$/i, // Like CarouselApi
    /Props$/i, // Like ButtonProps
    /Config$/i, // Like ChartConfig
    /^(Use\w+)$/i, // Like UseFormField
    /Context$/i, // Like TabsContext
    /Provider$/i, // Like TooltipProvider for certain cases
    /Store$/i, // Like DialogStore
    /Ref$/i, // Like DialogRef
    /Options$/i, // Like SelectOptions
  ],

  // File patterns to include
  include: /\.(tsx|ts)$/,

  // Files to exclude
  exclude: [/\.d\.ts$/, /\.test\.tsx?$/, /\.stories\.tsx?$/, /index\.ts$/],

  // Header comment for the generated file
  headerComment: `/**
 * This file was automatically generated.
 * DO NOT MODIFY IT BY HAND.
 * Run the script again to regenerate.
 */

`,

  // Show verbose output
  verbose: false,

  // Dry run mode
  dryRun: false,
};
