import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveCssColorToHex, hexToRgba } from './color';

describe('color utilities', () => {
  let originalGetComputedStyle: typeof window.getComputedStyle;

  beforeEach(() => {
    // Store original getComputedStyle
    originalGetComputedStyle = window.getComputedStyle;
  });

  afterEach(() => {
    // Restore original getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
    vi.restoreAllMocks();
  });

  describe('resolveCssColorToHex', () => {
    describe('hex colors', () => {
      it('should return valid 6-digit hex color as-is', () => {
        const result = resolveCssColorToHex('#ff0000');
        expect(result).toBe('#ff0000');
      });

      it('should return lowercase hex color as-is', () => {
        const result = resolveCssColorToHex('#abcdef');
        expect(result).toBe('#abcdef');
      });

      it('should return uppercase hex color as-is', () => {
        const result = resolveCssColorToHex('#ABCDEF');
        expect(result).toBe('#ABCDEF');
      });

      it('should handle mixed case hex colors', () => {
        const result = resolveCssColorToHex('#AbCdEf');
        expect(result).toBe('#AbCdEf');
      });
    });

    describe('RGB colors', () => {
      it('should convert rgb color to hex', () => {
        // Mock getComputedStyle to return rgb color
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor === 'rgb(255, 0, 0)' ? 'rgb(255, 0, 0)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('rgb(255, 0, 0)');
        expect(result).toBe('#ff0000');
      });

      it('should convert rgb color with spaces to hex', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor === 'rgb(0, 128, 255)' ? 'rgb(0, 128, 255)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('rgb(0, 128, 255)');
        expect(result).toBe('#0080ff');
      });

      it('should handle rgba color (ignore alpha)', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor === 'rgba(255, 0, 0, 0.5)' ? 'rgba(255, 0, 0, 0.5)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('rgba(255, 0, 0, 0.5)');
        expect(result).toBe('#ff0000');
      });
    });

    describe('oklch colors', () => {
      it('should convert oklch color to hex', () => {
        // Mock browser converting oklch to rgb
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          // Browser converts oklch to rgb internally
          return {
            color: styleColor.includes('oklch') ? 'rgb(6, 182, 212)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('oklch(78.9% 0.154 211.53)');
        expect(result).toBe('#06b6d4');
      });
    });

    describe('CSS variables', () => {
      it('should resolve CSS variable to hex', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          const mockColors: Record<string, string> = {
            'var(--color-blue-500)': 'rgb(59, 130, 246)',
          };
          return {
            color: mockColors[styleColor] || '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('var(--color-blue-500)');
        expect(result).toBe('#3b82f6');
      });
    });

    describe('named colors', () => {
      it('should convert named color to hex', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor === 'red' ? 'rgb(255, 0, 0)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('red');
        expect(result).toBe('#ff0000');
      });
    });

    describe('fallback behavior', () => {
      it('should return default fallback for invalid color', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = resolveCssColorToHex('invalid-color');
        expect(result).toBe('#000000');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[resolveCssColorToHex] Failed to resolve CSS color "invalid-color"')
        );

        consoleSpy.mockRestore();
      });

      it('should return custom fallback for invalid color', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = resolveCssColorToHex('invalid-color', '#ff0000');
        expect(result).toBe('#ff0000');

        consoleSpy.mockRestore();
      });

      it('should log warning when color resolution fails', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        resolveCssColorToHex('bad-color');

        expect(consoleSpy).toHaveBeenCalledWith(
          '[resolveCssColorToHex] Failed to resolve CSS color "bad-color". Computed color: "". Falling back to #000000.'
        );

        consoleSpy.mockRestore();
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = resolveCssColorToHex('');
        expect(result).toBe('#000000');

        consoleSpy.mockRestore();
      });

      it('should handle whitespace', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = resolveCssColorToHex('   ');
        expect(result).toBe('#000000');

        consoleSpy.mockRestore();
      });

      it('should handle 3-digit hex (not return as-is, needs conversion)', () => {
        window.getComputedStyle = vi.fn(() => {
          // Browser normalizes #f00 to rgb(255, 0, 0)
          return {
            color: 'rgb(255, 0, 0)',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('#f00');
        expect(result).toBe('#ff0000');
      });

      it('should handle 8-digit hex (with alpha)', () => {
        window.getComputedStyle = vi.fn(() => {
          // Browser normalizes #ff000080 to rgba(255, 0, 0, 0.5)
          return {
            color: 'rgba(255, 0, 0, 0.5)',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('#ff000080');
        expect(result).toBe('#ff0000');
      });
    });

    describe('return format', () => {
      it('should always return 6-digit hex format', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor === 'rgb(16, 185, 129)' ? 'rgb(16, 185, 129)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = resolveCssColorToHex('rgb(16, 185, 129)');
        expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      });

      it('should include leading hash', () => {
        const result = resolveCssColorToHex('#06b6d4');
        expect(result).toMatch(/^#/);
      });
    });
  });

  describe('hexToRgba', () => {
    describe('hex color conversion', () => {
      it('should convert hex to rgba with alpha', () => {
        const result = hexToRgba('#ff0000', 0.5);
        expect(result).toBe('rgba(255, 0, 0, 0.5)');
      });

      it('should convert hex to rgba with full opacity', () => {
        const result = hexToRgba('#00ff00', 1);
        expect(result).toBe('rgba(0, 255, 0, 1)');
      });

      it('should convert hex to rgba with zero opacity', () => {
        const result = hexToRgba('#0000ff', 0);
        expect(result).toBe('rgba(0, 0, 255, 0)');
      });

      it('should handle lowercase hex', () => {
        const result = hexToRgba('#abcdef', 0.75);
        expect(result).toBe('rgba(171, 205, 239, 0.75)');
      });

      it('should handle uppercase hex', () => {
        const result = hexToRgba('#ABCDEF', 0.75);
        expect(result).toBe('rgba(171, 205, 239, 0.75)');
      });
    });

    describe('alpha clamping', () => {
      it('should clamp alpha above 1 to 1', () => {
        const result = hexToRgba('#ff0000', 2.5);
        expect(result).toBe('rgba(255, 0, 0, 1)');
      });

      it('should clamp alpha below 0 to 0', () => {
        const result = hexToRgba('#ff0000', -0.5);
        expect(result).toBe('rgba(255, 0, 0, 0)');
      });

      it('should handle alpha exactly at bounds', () => {
        const result1 = hexToRgba('#ff0000', 0);
        const result2 = hexToRgba('#ff0000', 1);
        expect(result1).toBe('rgba(255, 0, 0, 0)');
        expect(result2).toBe('rgba(255, 0, 0, 1)');
      });
    });

    describe('non-hex color conversion', () => {
      it('should convert rgb color to rgba', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor === 'rgb(255, 0, 0)' ? 'rgb(255, 0, 0)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = hexToRgba('rgb(255, 0, 0)', 0.5);
        expect(result).toBe('rgba(255, 0, 0, 0.5)');
      });

      it('should convert oklch color to rgba', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          return {
            color: styleColor.includes('oklch') ? 'rgb(6, 182, 212)' : '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = hexToRgba('oklch(78.9% 0.154 211.53)', 0.25);
        expect(result).toBe('rgba(6, 182, 212, 0.25)');
      });
    });

    describe('fallback behavior', () => {
      it('should use default fallback for invalid color', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = hexToRgba('invalid-color', 0.5);
        // Default fallback is #06b6d4 (cyan-500)
        expect(result).toBe('rgba(6, 182, 212, 0.5)');

        consoleSpy.mockRestore();
      });

      it('should use custom fallback for invalid color', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = hexToRgba('invalid-color', 0.5, '#ff0000');
        expect(result).toBe('rgba(255, 0, 0, 0.5)');

        consoleSpy.mockRestore();
      });
    });

    describe('edge cases', () => {
      it('should handle empty string color', () => {
        window.getComputedStyle = vi.fn(() => {
          return {
            color: '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = hexToRgba('', 0.5);
        expect(result).toBe('rgba(6, 182, 212, 0.5)');

        consoleSpy.mockRestore();
      });

      it('should handle decimal alpha values', () => {
        const result = hexToRgba('#ff0000', 0.123456);
        expect(result).toBe('rgba(255, 0, 0, 0.123456)');
      });

      it('should handle very small alpha values', () => {
        const result = hexToRgba('#ff0000', 0.001);
        expect(result).toBe('rgba(255, 0, 0, 0.001)');
      });

      it('should handle very large alpha values', () => {
        const result = hexToRgba('#ff0000', 999);
        expect(result).toBe('rgba(255, 0, 0, 1)');
      });

      it('should handle negative alpha values', () => {
        const result = hexToRgba('#ff0000', -999);
        expect(result).toBe('rgba(255, 0, 0, 0)');
      });
    });

    describe('return format', () => {
      it('should always return rgba format', () => {
        const result = hexToRgba('#06b6d4', 0.5);
        expect(result).toMatch(/^rgba\(\d+, \d+, \d+, [0-9.]+\)$/);
      });

      it('should include spaces after commas', () => {
        const result = hexToRgba('#ff0000', 0.5);
        expect(result).toContain(', ');
      });
    });

    describe('integration with resolveCssColorToHex', () => {
      it('should handle CSS variables via resolveCssColorToHex', () => {
        window.getComputedStyle = vi.fn((element: Element) => {
          const styleColor = (element as HTMLElement).style.color;
          const mockColors: Record<string, string> = {
            'var(--color-primary)': 'rgb(187, 90, 56)',
          };
          return {
            color: mockColors[styleColor] || '',
          } as CSSStyleDeclaration;
        }) as typeof window.getComputedStyle;

        const result = hexToRgba('var(--color-primary)', 0.8);
        expect(result).toBe('rgba(187, 90, 56, 0.8)');
      });
    });
  });

  describe('color utility integration', () => {
    it('should work together for complex color transformations', () => {
      window.getComputedStyle = vi.fn((element: Element) => {
        const styleColor = (element as HTMLElement).style.color;
        return {
          color: styleColor.includes('oklch') ? 'rgb(6, 182, 212)' : styleColor,
        } as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle;

      // Convert oklch to hex
      const hex = resolveCssColorToHex('oklch(78.9% 0.154 211.53)');
      expect(hex).toBe('#06b6d4');

      // Then convert hex to rgba
      const rgba = hexToRgba(hex, 0.5);
      expect(rgba).toBe('rgba(6, 182, 212, 0.5)');
    });

    it('should handle end-to-end color conversion', () => {
      window.getComputedStyle = vi.fn((element: Element) => {
        const styleColor = (element as HTMLElement).style.color;
        const mockColors: Record<string, string> = {
          'var(--color-blue-500)': 'rgb(59, 130, 246)',
        };
        return {
          color: mockColors[styleColor] || styleColor,
        } as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle;

      // CSS var -> hex -> rgba
      const rgba = hexToRgba('var(--color-blue-500)', 0.75);
      expect(rgba).toBe('rgba(59, 130, 246, 0.75)');
    });
  });
});
