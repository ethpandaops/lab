/**
 * Paradigm color scheme for state composition visualization
 * Based on https://github.com/paradigmxyz/how-to-raise-the-gas-limit
 */

export const PARADIGM_COLORS = [
  '#59d759', // erc20 - Lime green
  '#1d90ff', // erc721 - Dodger blue
  '#ffb630', // Other - Orange
  '#afeeee', // Accounts - Pale turquoise
  '#AF6E4D', // DEX / DeFi - Brown
  '#9484f1', // Scam / Scheme - Medium slate blue
  '#ffdf30', // Infra - Gold
  'teal', // Bridge
  '#56aaaa', // Game - Teal
  '#E86100', // erc1155 - Dark orange
  '#F2C1D1', // Gambling - Pink
];

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  erc20: PARADIGM_COLORS[0],
  erc721: PARADIGM_COLORS[1],
  Other: PARADIGM_COLORS[2],
  Accounts: PARADIGM_COLORS[3],
  'DEX / DeFi': PARADIGM_COLORS[4],
  'Scam / Scheme': PARADIGM_COLORS[5],
  Infra: PARADIGM_COLORS[6],
  Bridge: PARADIGM_COLORS[7],
  Game: PARADIGM_COLORS[8],
  erc1155: PARADIGM_COLORS[9],
  Gambling: PARADIGM_COLORS[10],
};
