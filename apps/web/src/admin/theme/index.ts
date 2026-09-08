import { DEFAULT_THEME, createTheme, type MantineColorsTuple } from '@mantine/core';

export const brandNavy: MantineColorsTuple = [
  '#eaf6ff',
  '#d2edfe',
  '#b8ddf2',
  '#8fc4e5',
  '#5fa6d0',
  '#2f80b7',
  '#035b98',
  '#0c4a86',
  '#0a3d6d',
  '#062d50',
];

export const adminTheme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 8 },
  fontFamily: 'var(--font-sarabun), sans-serif',
  headings: { fontFamily: 'var(--font-prompt), sans-serif', fontWeight: '700' },
  colors: {
    brand: brandNavy,
    danger: DEFAULT_THEME.colors.red,
    warning: DEFAULT_THEME.colors.orange,
    success: DEFAULT_THEME.colors.teal,
  },
  breakpoints: { xs: '36em', sm: '48em', md: '62em', lg: '75em', xl: '88em' },
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },
  spacing: {
    ...DEFAULT_THEME.spacing,
    '2xl': 'calc(2.5rem * var(--mantine-scale))',
    '3xl': 'calc(3rem * var(--mantine-scale))',
  },
});
