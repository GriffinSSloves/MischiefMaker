# Current Tasks

## Miscellaneous

- ~~Run a documentation consistency check now that we are using a monorepo package, including Claude.md and any cursor rules files~~ ✅ **COMPLETED**
- ~~Split architecture.md into focused system design and separate coding standards documentation~~ ✅ **COMPLETED**

## Core Library Development

- ~~Design and document the core steganography algorithms~~ ✅ **COMPLETED** - See [Algorithm Specification](../core/docs/algorithm.md)
- ~~Choose steganography implementation approach~~ ✅ **COMPLETED** - Selected combination strategy with automatic fallback (Simple LSB → Triple Redundancy)
- ~~Implement capacity calculation for both simple and triple redundancy modes~~ ✅ **COMPLETED** - CapacityCalculator with 15 comprehensive tests
- ~~Implement CRC32 checksum validation for data integrity~~ ✅ **COMPLETED** - ChecksumUtility with multiple algorithms and 36 tests
- ~~Build magic signature detection ("MSCH" identifier) and validation~~ ✅ **COMPLETED** - HeaderUtility with complete header management and 36 tests
- ~~Build simple LSB embedding/extraction functions - 1 LSB per channel (primary method)~~ ✅ **COMPLETED** - PixelDataUtility with comprehensive pixel manipulation and 39 tests
- ~~Build triple redundancy LSB embedding/extraction functions - 1 LSB per channel with 3x encoding (fallback)~~ ✅ **COMPLETED** - PixelDataUtility with error correction support
- ~~Implement majority vote decoding for error correction in triple redundancy mode~~ ✅ **COMPLETED** - BitOperations with voting algorithms and 32 tests
- ~~Create comprehensive test suite for combination strategy~~ ✅ **COMPLETED** - 160 tests across 5 utility classes with full coverage
- ~~Set up shared utilities for image processing (platform-agnostic interfaces)~~ ✅ **COMPLETED** - Complete utility foundation with dependency injection architecture

### Next Phase: High-Level Interfaces

- **Implement IEncoder interfaces** (ISimpleLSBEncoder, ITripleRedundancyEncoder) - Build on existing utilities
- **Implement IDecoder interfaces** with automatic method detection and validation - Build on existing utilities
- **Implement ISteganographyEngine** with automatic method selection and fallback logic - Orchestrate all utilities
- **Create universal compression functions** (SMS/MMS quality level targeting - 45% quality)
- **Create image processing utilities** - JPEG compression, resizing, format conversion (platform-specific implementations)
- **Add encoding method detection** - identify which method was used during decoding
- **Create messaging service compatibility validation** - test both encoding methods with real scenarios

## Web Development

_All basic web development tasks completed! Ready for steganography feature integration._

## Future Development

### Mobile Development

- Set up React Native development environment
- Implement mobile-specific UI components
- Integrate with core steganography library

### Application Features

- Build the main steganography interface (encode/decode messages)
- Implement file upload and image processing with JPEG conversion
- Add messaging service compatibility warnings and recommendations
- Create user-friendly error handling and validation

### Future Algorithm Enhancements

- **Option B Implementation**: Direct JPEG coefficient manipulation (if reliability issues arise)
- **Reed-Solomon coding**: For extremely high reliability requirements
- **Adaptive LSB depth**: Automatic optimization based on image and message characteristics

---

## Completed Tasks

See [completed.md](completed.md) for a full list of finished tasks.
