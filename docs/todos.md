# Current Tasks

## HIGH PRIORITY – Visual Quality Polish

The DCT-based jp3g fork pipeline is fully functional. The only remaining functional gap is **minor grittiness / slight colour-shift** visible in some re-encoded images.

- Investigate quantization table reuse vs regeneration
- Compare encoder output against original quant tables to minimise drift
- Experiment with quality parameter vs coefficient rounding
- Add snapshot-based visual regression test (PSNR / SSIM > 40 dB target)

---

## CRITICAL ARCHITECTURE CHANGE - DCT Coefficient Steganography Required

### **Current Status: Pixel-Domain LSB Implementation Cannot Work**

The current implementation using pixel-domain LSB steganography is **fundamentally incompatible** with JPEG compression. The DCT/quantization process systematically destroys LSB relationships, making message recovery impossible even with triple redundancy.

**Mathematical Reality:**

- 100KB JPEG → 3MB pixel data (30:1 compression)
- DCT quantization eliminates LSB relationships as "noise"
- No amount of redundancy can overcome systematic coefficient destruction

**Current Implementation Status:**

- ✅ **275 tests passing** - All pixel-domain code works correctly
- ❌ **Fundamental design flaw** - Cannot survive JPEG compression
- 🔄 **Requires complete pivot** - DCT coefficient steganography needed

---

## JP3G FORK MODULARIZATION ✅ **COMPLETED (2025-07-11)**

All legacy Huffman limitations have been resolved. The fork now produces fully spec-compliant JPEGs that parse in strict decoders, and every automated test (unit, integration, E2E, round-trip) passes.

**Current Status:**

• ✅ Direct encode/decode tests pass  
• ✅ Coefficient modification tests pass  
• ✅ E2E & round-trip tests pass  
• ✅ Strict decoder re-parse succeeds

**Technical Fixes Implemented:**

1. Standard baseline Huffman tables are written explicitly (DHT marker)
2. MCU output interleaves Y/Cb/Cr blocks with optional chroma up-sampling
3. Bit buffer alignment before EOI ensures clean termination
4. Quant-table fallbacks & validation added

No outstanding issues remain for the forked encoder.

### **jp3gDecoder.ts Refactoring ✅ COMPLETED (2025-07-11)**

Successfully refactored the monolithic jp3gDecoder.ts (946 lines) into a modular architecture following the coding standards established by jp3gencoder.ts. Applied test-driven methodology throughout.

**Extracted Utility Modules:**

1. **markerParsers.ts** - 11 JPEG marker parsing functions (15 test cases)
   - parseAPP0, parseAPP1, parseAPP14, parseDQT, parseDHT, parseSOF, etc.
   - Fixed parseSOSHeader test failure by adding missing scanLength read

2. **colorSpaceConverter.ts** - 8 color space conversion functions (19 test cases)
   - convertColorSpace with support for grayscale, RGB, CMYK
   - Fixed scaling logic test error in conversion expectations

3. **imageDataBuilder.ts** - 4 HTML5 Canvas ImageData formatting functions (13 test cases)
   - copyToImageData routing based on component count
   - Support for RGBA and RGB formatting

**Results:**

- ✅ Reduced jp3gDecoder.ts from 946 to ~640 lines (35% reduction)
- ✅ All 47 new utility tests pass
- ✅ All jp3gForkClient integration tests pass (no regressions)
- ✅ Maintained complete steganography functionality
- ✅ Improved maintainability and coding standards compliance

---

## HIGH PRIORITY: DCT Coefficient Implementation

### **Phase 1: Research & Library Evaluation**

- **Research JPEG DCT libraries** for web platform (mozjpeg.js, jpegjs)
- **Evaluate mobile platform options** (libjpeg-turbo React Native bindings)
- **Test Node.js DCT libraries** (sharp with custom JPEG processing)
- **Benchmark coefficient extraction** performance across platforms
- **Validate coefficient modification** stability across quality levels

### **Phase 2: Core DCT Algorithm Development**

- **Implement DCT coefficient extraction** from JPEG structure
- **Build AC coefficient modification** algorithm (preserve DC coefficients)
- **Create triple redundancy** embedding in AC coefficients
- **Implement majority vote decoding** for error correction
- **Develop capacity calculation** based on available AC coefficients

### **Phase 3: Platform Integration**

- **Web DCT processor** - mozjpeg.js integration
- **Mobile DCT processor** - libjpeg-turbo React Native bindings
- **Node.js DCT processor** - sharp with custom JPEG processing
- **Cross-platform testing** and optimization
- **Performance benchmarking** for production use

### **Phase 4: Messaging Service Validation**

- **Test iMessage compatibility** (75% quality re-compression)
- **Test WhatsApp compatibility** (65% quality re-compression)
- **Test SMS/MMS compatibility** (45% quality re-compression)
- **Test Telegram compatibility** (75% quality re-compression)
- **Validate message recovery** across all services

---

## DEPRECATED: Pixel-Domain LSB Implementation

### **Current Core Foundation - DEPRECATED BUT COMPLETE**

The following implementation is **technically sound** but **fundamentally incompatible** with JPEG compression:

- ~~Complete steganography engine with 275 tests across utilities, algorithms, services, and integration (100% pass rate)~~ ❌ **DEPRECATED**
- ~~Production-ready SteganographyEngine with automatic method selection, fallback logic, and validation~~ ❌ **DEPRECATED**
- ~~Real encode-decode workflows with corruption recovery and cross-algorithm error handling~~ ❌ **DEPRECATED**
- ~~Production-ready algorithms with SimpleLSB (maximum capacity) and TripleRedundancy (error correction)~~ ❌ **DEPRECATED**

### **Preserve for Reference**

- **Keep existing code** as reference implementation
- **Archive pixel-domain tests** for educational purposes
- **Document lessons learned** from pixel-domain approach
- **Extract reusable utilities** (CRC32, header management, bit operations)

---

## FOUNDATION STATUS

### ✅ **Completed Foundation (Still Valid)**

- **Modern monorepo setup** with pnpm workspaces
- **Zero TypeScript errors** across entire codebase
- **Modern development tooling** with ESLint flat config, Prettier, and pre-commit hooks
- **Type system atomization** - every type in its own file with direct imports
- **Platform-agnostic architecture** with dependency injection for image processing
- **Clean interface design** with clear, descriptive function names

### ✅ **Completed Web Foundation (Still Valid)**

- **Modern React 19 setup** with TypeScript, Vite, TailwindCSS v4
- **ShadCN UI component library** fully integrated
- **React Router v7** with createBrowserRouter and lazy loading
- **Comprehensive testing setup** with Vitest and React Testing Library
- **Complete development tooling** with formatting, linting, and type checking

### ❌ **Deprecated Core Implementation**

- **Pixel-domain LSB algorithms** - SimpleLSBEncoder/Decoder, TripleRedundancyEncoder/Decoder
- **Pixel-based SteganographyEngine** - Cannot survive JPEG compression
- **275 pixel-domain tests** - Technically correct but fundamentally flawed approach
- **CanvasImageProcessor** - Current implementation assumes pixel-domain processing

---

## NEXT STEPS

### **Immediate Actions**

1. **Mark current implementation as deprecated** in code comments
2. **Research DCT coefficient libraries** for target platforms
3. **Create proof-of-concept** DCT coefficient modification
4. **Test basic JPEG coefficient stability** across quality levels
5. **Design new DCT-based interfaces** and architecture

### **Implementation Strategy**

1. **Keep existing utilities** - CRC32, header management, bit operations are reusable
2. **Replace image processing** - DCT coefficient manipulation instead of pixel-domain
3. **Maintain interface compatibility** - Same public API, different internal implementation
4. **Preserve test structure** - Replace pixel-domain tests with DCT coefficient tests
5. **Validate messaging compatibility** - Real-world testing with messaging services

### **Success Criteria**

- **DCT coefficient steganography** successfully embeds/extracts messages
- **Messaging service compatibility** - messages survive re-compression
- **Quality preservation** - visual changes remain imperceptible
- **Performance optimization** - production-ready speed and memory usage
- **Cross-platform support** - web, mobile, and Node.js implementations

---

## RECENTLY COMPLETED (2025-01-27) - DEPRECATED

- ~~Fix all TypeScript compilation errors including missing exports and AlgorithmConfig properties~~ ✅ **COMPLETED** (deprecated)
- ~~Add TypeScript type checking to pre-commit scripts for both core and web packages~~ ✅ **COMPLETED** (still valid)
- ~~Replace manual header size calculations with HeaderUtility.getHeaderSize() calls~~ ✅ **COMPLETED** (deprecated)
- ~~Move each utility and test into its own folder (BitOperations/BitOperations.ts, etc.)~~ ✅ **COMPLETED** (still valid)
- ~~Split DataTypes.ts into separate files for each type (SteganographyHeader.ts, PixelData.ts, etc.)~~ ✅ **COMPLETED** (still valid)
- ~~Split AlgorithmTypes.ts into individual files (EncodingMethod.ts, AlgorithmConfig.ts, etc.)~~ ✅ **COMPLETED** (still valid)
- ~~Split ResultTypes.ts into individual files (EncodingResult.ts, DecodingResult.ts, etc.)~~ ✅ **COMPLETED** (still valid)
- ~~Improve IImageProcessor interface function naming and fix any type usage~~ ✅ **COMPLETED** (needs updating for DCT)

## COMPLETED TASKS - DEPRECATED

See [completed.md](completed.md) for a full history of finished tasks. **Note**: Most completed tasks are now deprecated due to the architectural pivot to DCT coefficient steganography.

---

## ARCHITECTURAL DECISION SUMMARY

**Decision**: Pivot from pixel-domain LSB to DCT coefficient steganography

**Rationale**:

- Pixel-domain LSB fundamentally cannot survive JPEG compression
- DCT coefficients are preserved during JPEG-to-JPEG compression
- Messaging services use JPEG compression, requiring DCT coefficient approach
- No amount of redundancy can overcome systematic DCT quantization

**Impact**:

- Complete reimplementation of core steganography algorithms
- Platform-specific JPEG libraries required
- Existing utilities (CRC32, headers, bit operations) remain useful
- Web app and project structure remain unchanged
- Messaging service compatibility becomes achievable
