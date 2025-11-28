export type Theme = 'light' | 'dark' | 'star';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  clearTheme: () => void;
}
