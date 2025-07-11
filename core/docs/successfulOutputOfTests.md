```
✅ Test image loaded: 276642 bytes

=== Testing jp3g fork internal access ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Parse result: {
  success: true,
  error: undefined,
  hasJpegStructure: true,
  hasDctCoefficients: true,
  hasInternalDecoder: true
}
DCT Coefficients found: {
  totalBlocks: 21600,
  width: 1440,
  height: 960,
  firstBlockDC: 147,
  firstBlockACCount: 63
}
First block sample coefficients:
  DC: 147
  First 10 AC: [
  2, 0,  0,  0,  0,
  0, 0, -2, -2, -2
]
✅ INTERNAL ACCESS TEST PASSED

=== Debugging jp3g fork internal structure ===
=== JP3G FORK DEBUG: Internal Structure Analysis ===
Parsing with direct decoder access...
=== DECODER STRUCTURE ===
Width: 1440
Height: 960
Components: 3

--- Component 0 ---
Properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
Scale X: 1
Scale Y: 1
Lines: 960
First line length: 1440

--- Component 1 ---
Properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
Scale X: 0.5
Scale Y: 0.5
Lines: 480
First line length: 720

--- Component 2 ---
Properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
Scale X: 0.5
Scale Y: 0.5
Lines: 480
First line length: 720

=== ALL DECODER PROPERTIES ===
opts: object
comments: object [0]
exifBuffer: object
width: number
height: number
jfif: object
adobe: object
components: object [3]
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
✅ DEBUG STRUCTURE TEST COMPLETED

=== Testing DCT coefficient modification ===
=== END-TO-END STEGANOGRAPHY: EMBED & RE-ENCODE ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Original JPEG: 1440x960, 3 components
✅ Embedded 11 bytes (88 bits) in 88 coefficients
Re-encoding JPEG with modified DCT coefficients...
✅ Re-encoded JPEG: 324409 bytes
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
✅ COEFFICIENT MODIFICATION TEST PASSED

=== Testing end-to-end steganography workflow ===
=== END-TO-END STEGANOGRAPHY: EMBED & RE-ENCODE ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Original JPEG: 1440x960, 3 components
✅ Embedded 23 bytes (184 bits) in 184 coefficients
Re-encoding JPEG with modified DCT coefficients...
✅ Re-encoded JPEG: 324409 bytes
Embed result: {
  success: true,
  error: undefined,
  modifiedJpegSize: 324409,
  coefficientsModified: 184,
  totalBlocks: 21600
}
✅ End-to-end test completed successfully!
   Original JPEG: 276642 bytes
   Modified JPEG: 324409 bytes
   Size difference: 47767 bytes
   Coefficients modified: 184
   Total blocks processed: 21600
   ✅ Modified JPEG with embedded message saved to: /Users/griffinsloves/dev/MischiefMaker/core/tests/output/steganography_modified.jpg
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
✅ Modified JPEG can be parsed: true
   DCT coefficients accessible: Yes
   Blocks in modified JPEG: 21600

=== Testing complete round-trip steganography ===
Test message: "Hello world! This is a test." (28 bytes)
=== ROUND-TRIP STEGANOGRAPHY TEST ===
Testing with message: "Hello world! This is a test."
=== END-TO-END STEGANOGRAPHY: EMBED & RE-ENCODE ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Original JPEG: 1440x960, 3 components
✅ Embedded 28 bytes (224 bits) in 224 coefficients
Re-encoding JPEG with modified DCT coefficients...
✅ Re-encoded JPEG: 324409 bytes
Embedding completed: 324409 bytes
=== EXTRACTING MESSAGE FROM STEGANOGRAPHY ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Extracting from JPEG: 1440x960, 3 components
✅ Extracted 28 bytes (224 bits) from 224 coefficients
Original message: "Hello world! This is a test."
Extracted message: "Hello world! This is a test."
Messages match: ✅ YES
Round-trip result: {
  success: true,
  error: undefined,
  messagesMatch: true,
  originalMessage: 'Hello world! This is a test.',
  extractedMessage: 'Hello world! This is a test.',
  stats: {
    originalSize: 276642,
    modifiedSize: 324409,
    coefficientsModified: 224,
    coefficientsRead: 224
  }
}
🎉 ROUND-TRIP STEGANOGRAPHY SUCCESS!
   Messages match: ✅ YES
   Original: "Hello world! This is a test."
   Extracted: "Hello world! This is a test."
   File size: 276642 → 324409 bytes
   Size change: 47767 bytes
   Coefficients modified: 224
   Coefficients read: 224
   Modified JPEG saved to: /Users/griffinsloves/dev/MischiefMaker/core/tests/output/modified_with_steganography.jpg
   File size: 324409 bytes

=== Comparing fork vs original jp3g ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Fork Results:
  Success: true
  Has DCT coefficients: true
  Total blocks found: 21600

Original jp3g Results:
  Components: 0
  Width: undefined
  Height: undefined
  Available properties: [
  '0',  '1',  '2',  '3',
  '4',  '5',  '6',  '7',
  '8',  '9',  '10', '11',
  '12', '13', '14', '15'
]
  Has block data: undefined

=== COMPARISON SUMMARY ===
Fork has DCT access: true
Original has DCT access: undefined
🎉 SUCCESS: Fork provides DCT access that original lacks!
✅ COMPARISON TEST COMPLETED

=== Testing basic re-encoding without modifications ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Parsed JPEG: 1440x960, 3 components
✅ Re-encoded JPEG (no mods): 324343 bytes
Original: 276642 bytes, Re-encoded: 324343 bytes
   ✅ Re-encoded JPEG (unmodified) saved to: /Users/griffinsloves/dev/MischiefMaker/core/tests/output/re_encoded_unmodified.jpg
Testing if re-encoded JPEG can be parsed...
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
🎉 SUCCESS: Re-encoded JPEG can be parsed!
Re-parsed: 1440x960
Components: 3
DCT blocks: 21600
```

e2e

```
=== END-TO-END STEGANOGRAPHY: EMBED & RE-ENCODE ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Original JPEG: 1440x960, 3 components
✅ Embedded 42 bytes (336 bits) in 336 coefficients
Re-encoding JPEG with modified DCT coefficients...
✅ Re-encoded JPEG: 324408 bytes
✅ E2E: Message embedded and saved to /Users/griffinsloves/dev/MischiefMaker/core/tests/output/e2e_modified_2025-07-11T04-26-18.022Z.jpg
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
✅ E2E: Modified JPEG is valid and parsable
=== EXTRACTING MESSAGE FROM STEGANOGRAPHY ===
=== JP3G FORK CLIENT: Testing internal access ===
Fork parsed JPEG successfully
Available properties: [
  'width',
  'height',
  'components',
  'jfif',
  'adobe',
  'comments',
  '_decoder'
]
Internal decoder available: true
Decoder properties: [
  'opts',
  'comments',
  'exifBuffer',
  'width',
  'height',
  'jfif',
  'adobe',
  'components'
]
Components: 3
First component properties: [
  'lines',
  'scaleX',
  'scaleY',
  'dctBlocks',
  'blocksPerLine',
  'blocksPerColumn',
  'quantizationTable'
]
✅ SUCCESS: Found preserved DCT blocks in fork!
DCT Blocks structure: {
  rows: 120,
  cols: 180,
  blockType: 'object',
  blockLength: 64,
  blocksPerLine: 180,
  blocksPerColumn: 120
}
Extracting from JPEG: 1440x960, 3 components
✅ Extracted 42 bytes (336 bits) from 336 coefficients
✅ E2E: Message extracted successfully: "This is a secret message for the E2E test!"

```
