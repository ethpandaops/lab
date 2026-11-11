import { describe, expect, it } from 'vitest';
import { contrastRatio, sameColor } from './contrast';

describe('contrastRatio', () => {
  it('spans 1 to 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#576072', '#f6f7f9')).toBe(contrastRatio('#f6f7f9', '#576072'));
  });

  it('reads hex and rgb() alike', () => {
    expect(contrastRatio('#fff', 'rgb(0, 0, 0)')).toBeCloseTo(21, 5);
    expect(contrastRatio('rgb(255 255 255)', '#000')).toBeCloseTo(21, 5);
  });

  it('refuses a translucent colour, whose contrast depends on what is behind it', () => {
    expect(() => contrastRatio('rgb(0 0 0 / 10%)', '#ffffff')).toThrow(/opaque/);
    expect(() => contrastRatio('#0000001a', '#ffffff')).toThrow(/opaque/);
  });

  it('rejects notations it cannot read', () => {
    expect(() => contrastRatio('oklch(0.5 0.1 200)', '#000')).toThrow(/hex or rgb\(\)/);
    expect(() => contrastRatio('red', '#000')).toThrow(/hex or rgb\(\)/);
  });
});

describe('sameColor', () => {
  it('matches a colour across notations', () => {
    expect(sameColor('#ffffff', 'rgb(255 255 255)')).toBe(true);
    expect(sameColor('#fff', '#ffffff')).toBe(true);
  });

  it('compares alpha', () => {
    expect(sameColor('rgb(0 0 0 / 50%)', 'rgba(0, 0, 0, 0.5)')).toBe(true);
    expect(sameColor('#000000', 'rgb(0 0 0 / 50%)')).toBe(false);
  });

  it('tells different colours apart', () => {
    expect(sameColor('#f6f7f9', '#f6f7fa')).toBe(false);
  });
});
