export const LAYOUT = {
  CONTENT_PADDING: {
    DEFAULT: '1rem',
    MD: '1.5rem',
    LG: '2rem',
    XL: '3rem',
    '2XL': '4rem'
  },
  CONTENT_MAX_WIDTH: '100%',
  SIDEBAR_WIDTH: '20rem',
  TIMELINE_HEIGHT: '6rem'
} as const;

// Breakpoints in pixels
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
} as const; 