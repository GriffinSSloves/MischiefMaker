import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      const condition = false;
      expect(cn('class1', condition && 'class2', 'class3')).toBe('class1 class3');
    });

    it('handles undefined and null values', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
    });

    it('merges Tailwind classes correctly (deduplication)', () => {
      // This tests the tailwind-merge functionality
      expect(cn('p-2 p-4')).toBe('p-4');
      expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500');
    });

    it('returns empty string for no arguments', () => {
      expect(cn()).toBe('');
    });
  });
});
