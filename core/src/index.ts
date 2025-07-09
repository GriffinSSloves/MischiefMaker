// Core interfaces - direct imports
export type { IImageProcessor, IImageData, ImageFormat } from './interfaces/IImageProcessor';
export type { IFileSystem } from './interfaces/IFileSystem';
export type { ISteganographyEngine } from './interfaces/ISteganographyEngine';
export type { IEncoder, ISimpleLSBEncoder, ITripleRedundancyEncoder, IAdaptiveLSBEncoder } from './interfaces/IEncoder';
export type { IDecoder, ISimpleLSBDecoder, ITripleRedundancyDecoder, IAdaptiveLSBDecoder } from './interfaces/IDecoder';
export type { ICapacityCalculator } from './interfaces/ICapacityCalculator';

// Algorithm types - direct imports
export type { EncodingMethod, AlgorithmConfig, CompressionOptions, LSBConfig } from './types/AlgorithmTypes';

// Data types - direct imports
export type { SteganographyHeader, PixelData, CapacityInfo, BitOperation } from './types/DataTypes';

// Result types - direct imports
export type { EncodingResult, DecodingResult, ValidationResult, CapacityCheckResult } from './types/ResultTypes';

// Constants - direct imports
export {
  ALGORITHM_CONSTANTS,
  HEADER_CONSTANTS,
  CAPACITY_CONSTANTS,
  MESSAGING_SERVICE_CONSTANTS,
  ERROR_CODES,
} from './types/Constants';

// Implementations
export { CapacityCalculator } from './utils/CapacityCalculator';
export { BitOperations } from './utils/BitOperations';
export { ChecksumUtility } from './utils/ChecksumUtility';
export { HeaderUtility } from './utils/HeaderUtility';
export { PixelDataUtility } from './utils/PixelDataUtility';

// Legacy exports for compatibility
export type { EncodeOptions, DecodeOptions } from './models/SteganographyOptions';
export type { EncodeResult, DecodeResult } from './models/ProcessingResult';
export { SteganographyError, ErrorCodes } from './errors/SteganographyError';
