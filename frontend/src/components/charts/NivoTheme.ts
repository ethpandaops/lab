import { Theme } from '@nivo/core';

// Define a default theme for Nivo charts
export const defaultNivoTheme: Theme = {
  background: 'transparent',
  text: {
    fill: 'currentColor',
    fontSize: 12,
  },
  axis: {
    domain: {
      line: {
        stroke: 'currentColor',
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: 'currentColor',
      },
    },
    ticks: {
      line: {
        stroke: 'currentColor',
        strokeWidth: 1,
      },
      text: {
        fontSize: 10,
        fill: 'currentColor',
      },
    },
  },
  grid: {
    line: {
      stroke: 'rgba(128, 128, 128, 0.15)',
      strokeWidth: 1,
    },
  },
  legends: {
    text: {
      fill: 'currentColor',
      fontSize: 12,
    },
  },
  labels: {
    text: {
      fill: 'currentColor',
      fontSize: 12,
    },
  },
  tooltip: {
    container: {
      background: 'var(--color-background)',
      color: 'var(--color-text-primary)',
      fontSize: 12,
      borderRadius: 4,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
      padding: '5px 9px',
    },
  },
};
