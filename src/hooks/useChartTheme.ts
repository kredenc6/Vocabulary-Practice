import { useEffect, useState } from 'react';

/** CSS custom properties (defined in index.css) that charts need as concrete colors. */
const CHART_VARS = {
  series1: '--series-1',
  series2: '--series-2',
  series3: '--series-3',
  surface: '--surface',
  grid: '--grid',
  axis: '--axis',
  axisText: '--axis-text',
  text: '--text',
} as const;

export type ChartTheme = Record<keyof typeof CHART_VARS, string>;

function readTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  const theme = {} as ChartTheme;
  for (const [key, cssVar] of Object.entries(CHART_VARS) as [keyof ChartTheme, string][]) {
    theme[key] = style.getPropertyValue(cssVar).trim();
  }
  return theme;
}

/** Chart colors for the current light/dark scheme; updates when the OS theme changes. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(readTheme());
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return theme;
}
