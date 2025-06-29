import { describe, it, expect } from 'vitest';
import { SteganographyError, ErrorCodes } from '../src/errors/SteganographyError';

describe('SteganographyError', () => {
  it('should create an error with message and code', () => {
    const error = new SteganographyError('Test error', ErrorCodes.INVALID_INPUT);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
    expect(error.name).toBe('SteganographyError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SteganographyError);
  });
});

describe('ErrorCodes', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCodes.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(ErrorCodes.INVALID_FORMAT).toBe('INVALID_FORMAT');
    expect(ErrorCodes.IMAGE_LOAD_FAILED).toBe('IMAGE_LOAD_FAILED');
    expect(ErrorCodes.EMBEDDING_FAILED).toBe('EMBEDDING_FAILED');
    expect(ErrorCodes.EXTRACTION_FAILED).toBe('EXTRACTION_FAILED');
    expect(ErrorCodes.MESSAGE_TOO_LARGE).toBe('MESSAGE_TOO_LARGE');
    expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });
});
