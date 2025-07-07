# Current Tasks

## Miscellaneous

- ~~Run a documentation consistency check now that we are using a monorepo package, including Claude.md and any cursor rules files~~ ✅ **COMPLETED**

## Core Library Development

- ~~Design and document the core steganography algorithms~~ ✅ **COMPLETED** - See [Algorithm Specification](../core/docs/algorithm.md)
- ~~Choose steganography implementation approach~~ ✅ **COMPLETED** - Selected combination strategy with automatic fallback (Simple LSB → Triple Redundancy)
- **Implement JPEG-first LSB steganography algorithm** with combination strategy and messaging service compatibility
- **Create universal compression functions** (SMS/MMS quality level targeting - 45% quality)
- **Build magic signature detection** ("MSCH" identifier) and validation
- **Implement CRC32 checksum validation** for data integrity
- **Create image processing utilities** - JPEG compression, resizing, format conversion
- **Build simple LSB embedding/extraction functions** - 1 LSB per channel (primary method)
- **Build triple redundancy LSB embedding/extraction functions** - 1 LSB per channel with 3x encoding (fallback)
- **Implement majority vote decoding** for error correction in triple redundancy mode
- **Create automatic fallback logic** - try simple first, fall back to triple redundancy
- **Add encoding method detection** - identify which method was used for decoding
- **Create messaging service compatibility validation** - test both encoding methods
- **Implement capacity calculation** for both simple and triple redundancy modes
- **Create comprehensive test suite** for combination strategy and messaging service simulation
- Set up shared utilities for image processing (platform-agnostic interfaces)
- Create cross-platform compatible APIs

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
- Build capacity calculator for users (message size vs image size with redundancy)

### Future Algorithm Enhancements

- **Option B Implementation**: Direct JPEG coefficient manipulation (if reliability issues arise)
- **Reed-Solomon coding**: For extremely high reliability requirements
- **Adaptive LSB depth**: Automatic optimization based on image and message characteristics

---

## Completed Tasks

See [completed.md](completed.md) for a full list of finished tasks.
