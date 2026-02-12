/** Regex for a valid BLS pubkey: 0x followed by exactly 96 hex characters */
const PUBKEY_REGEX = /^0x[0-9a-fA-F]{96}$/;

/**
 * Parse a list of tags to extract validator indices and pubkeys
 *
 * - A valid pubkey: starts with `0x`, followed by exactly 96 hex characters (total 98 chars)
 * - A valid index: non-negative integer
 * - Everything else: invalid
 */
export function parseValidatorIndices(tags: string[]): {
  valid: number[];
  pubkeys: string[];
  invalid: string[];
} {
  const valid: number[] = [];
  const pubkeys: string[] = [];
  const invalid: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;

    if (PUBKEY_REGEX.test(trimmed)) {
      pubkeys.push(trimmed);
    } else {
      const num = parseInt(trimmed, 10);
      if (Number.isInteger(num) && num >= 0 && String(num) === trimmed) {
        valid.push(num);
      } else {
        invalid.push(trimmed);
      }
    }
  }

  // Remove duplicates
  return {
    valid: [...new Set(valid)],
    pubkeys: [...new Set(pubkeys.map(pk => pk.toLowerCase()))],
    invalid: [...new Set(invalid)],
  };
}
