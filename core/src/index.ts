// Interfaces
export type { ImageProcessor, ImageData, ImageFormat } from './interfaces/ImageProcessor';
export type { FileSystem } from './interfaces/FileSystem';

// Models
export type { EncodeOptions, DecodeOptions } from './models/SteganographyOptions';
export type { EncodeResult, DecodeResult } from './models/ProcessingResult';

// Errors
export { SteganographyError, ErrorCodes } from './errors/SteganographyError';

// Services (to be implemented)
// export { SteganographyService } from './services/SteganographyService'; 