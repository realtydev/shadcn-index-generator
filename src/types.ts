/**
 * Types for the shadcn-index-generator
 */

/**
 * File system error type
 */
export interface FileSystemError extends Error {
  code?: string;
  path?: string;
  syscall?: string;
  errno?: number;
}
