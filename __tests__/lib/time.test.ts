import { describe, it, expect } from 'vitest';
import { to24Hour } from '@/lib/time';

describe('to24Hour', () => {
  it('converts 9:00 AM to 09:00', () => {
    expect(to24Hour('9:00 AM')).toBe('09:00');
  });

  it('converts 12:00 PM to 12:00', () => {
    expect(to24Hour('12:00 PM')).toBe('12:00');
  });

  it('converts 2:00 PM to 14:00', () => {
    expect(to24Hour('2:00 PM')).toBe('14:00');
  });

  it('converts 12:00 AM to 00:00', () => {
    expect(to24Hour('12:00 AM')).toBe('00:00');
  });

  it('converts 5:30 PM to 17:30', () => {
    expect(to24Hour('5:30 PM')).toBe('17:30');
  });
});
