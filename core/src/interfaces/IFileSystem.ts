/**
 * Minimal interface for file system operations
 * Abstracts platform-specific file handling (browser File API, native file system)
 */
export interface IFileSystem {
  /**
   * Read file as ArrayBuffer
   */
  readFile(path: string): Promise<ArrayBuffer>;

  /**
   * Write ArrayBuffer to file
   */
  writeFile(path: string, data: ArrayBuffer): Promise<void>;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file size in bytes
   */
  getFileSize(path: string): Promise<number>;

  /**
   * Get file metadata
   */
  getFileInfo(path: string): Promise<{ size: number; lastModified: Date }>;
}
