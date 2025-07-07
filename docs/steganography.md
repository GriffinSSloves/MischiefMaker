# Steganography Implementation

## Overview

This document contains technical specifications for the steganography implementation in MischiefMaker.

For detailed algorithm design and implementation decisions, see **[Algorithm Specification](../core/docs/algorithm.md)**.

## Core Strategy

**JPEG-First Approach with Combination Strategy**: Pre-compress images to messaging service standards (SMS/MMS level) and use intelligent fallback encoding to ensure universal compatibility and optimal capacity utilization across iMessage, WhatsApp, SMS, and other messaging platforms.

## Key Features

- **Universal Messaging Compatibility**: Works through all major messaging services
- **Combination Strategy**: Automatic fallback from simple LSB to triple redundancy
- **Optimal Capacity Usage**: 288KB when simple method works, 96KB with triple redundancy fallback
- **Automatic Method Selection**: Algorithm chooses best approach based on image characteristics
- **JPEG-optimized LSB steganography**: Designed for already-compressed images
- **Conservative compression**: Targets SMS/MMS standards (most restrictive)
- **Magic signature identification**: "MSCH" identifier for MischiefMaker images
- **CRC32 checksum validation**: Robust error detection
- **Version support**: Future algorithm compatibility

## Technical Requirements

### **Compression Standards**

- **Quality Level**: 45% (SMS/MMS compatible)
- **Maximum File Size**: 1MB (universal limit)
- **Maximum Dimensions**: 1024px (common messaging limit)
- **Format**: JPEG output for all inputs

### **LSB Configuration**

- **Depth**: 1 LSB per channel (maximum invisibility)
- **Channels**: RGB (Red, Green, Blue)
- **Redundancy**: Triple encoding (3x storage per bit)
- **Distribution**: Spread across different pixel locations

## Implementation Details

**Pre-Compression Process**: All images are converted to JPEG at SMS/MMS quality levels before steganographic embedding to prevent messaging services from applying additional compression.

**Combination Strategy**:

1. **First attempt**: Simple LSB encoding for maximum capacity (288KB)
2. **Automatic fallback**: Triple redundancy if simple method fails due to image characteristics
3. **Future enhancement**: Adaptive LSB depth for edge cases

**Triple Redundancy Fallback**: When activated, each message bit is encoded 3 times in different pixel locations. During decoding, majority vote (2 out of 3) determines the final bit value, providing extremely high reliability even with compression artifacts.

**Data Structure**: Simplified header with magic signature, version, message length, encoding method indicator, and CRC32 checksum.

**Capacity**: ~288KB for simple LSB (optimal), ~96KB with triple redundancy fallback (still 96x more than target 1KB message size).

For complete algorithm specifications, detailed capacity calculations, and implementation examples, see **[Algorithm Specification](../core/docs/algorithm.md)** and **[Image Technical Considerations](../core/docs/image-technical-considerations.md)**.

## Messaging Service Compatibility

**Requirement**: All output images must survive compression by any messaging service with automatic fallback providing optimal capacity and reliability.

**Tested Services**: iMessage, WhatsApp, SMS/MMS, Telegram, Signal
**Strategy**: Pre-compress to most restrictive service level (SMS/MMS) + intelligent encoding method selection

## Reliability vs Capacity Trade-offs

- **Simple LSB**: 100% capacity (288KB), medium reliability (~80-95%)
- **Triple redundancy**: 33% capacity (96KB), very high reliability (~99.9%)
- **Automatic selection**: Algorithm chooses best method for each image
- **Use Case**: Ideal for 1KB target messages with optimal capacity utilization

## Security Considerations

- **Compression resistance**: Algorithm designed to survive messaging service compression
- **Triple redundancy**: Extremely high data survival rate
- **Magic signature validation**: Prevents false positive detection
- **CRC32 checksums**: Robust error detection and data integrity
- **Version compatibility**: Future algorithm updates supported
- **Visual imperceptibility**: Changes remain invisible to human eye

## Performance Considerations

- **JPEG optimization**: Specialized for compressed image processing
- **Memory management**: Efficient handling of large images with redundancy
- **Web Workers**: CPU-intensive operations offloaded on web platform
- **Native processing**: Platform-specific optimizations for mobile
- **Configurable quality**: Easy adjustment of compression levels
- **Redundancy overhead**: 3x encoding/decoding operations
