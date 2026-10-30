/** One line of a chart tooltip */
export interface TooltipRow {
  color?: string;
  label: string;
  value: string;
}

/**
 * Tooltip HTML in the chart tooltip style: a bold heading and one row per value, values right-aligned.
 */
export function renderTooltip(heading: string, rows: TooltipRow[]): string {
  const lines = rows.map(
    row =>
      `<div style="display:flex;align-items:center;gap:8px;">` +
      (row.color
        ? `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${row.color};"></span>`
        : '') +
      `<span>${row.label}</span>` +
      `<span style="margin-left:auto;padding-left:12px;font-weight:600;font-variant-numeric:tabular-nums;">${row.value}</span>` +
      `</div>`
  );
  return `<div style="margin-bottom:4px;font-weight:600;">${heading}</div>${lines.join('')}`;
}

/**
 * Index of the hovered point from ECharts axis-tooltip params.
 */
export function hoveredIndex(params: unknown): number | null {
  const first = (Array.isArray(params) ? params[0] : params) as { dataIndex?: number } | undefined;
  return first?.dataIndex ?? null;
}
