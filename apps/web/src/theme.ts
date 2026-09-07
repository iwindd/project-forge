import { createTheme, type MantineColorsTuple } from '@mantine/core';

const brandBlue: MantineColorsTuple = [
  '#e7f1fb',
  '#d2e7f6',
  '#b4d5eb',
  '#8ebbd9',
  '#5f9fc5',
  '#2f80b7',
  '#035b98',
  '#0c4a86',
  '#0a3d6d',
  '#062d50',
];

export const projectForgeTheme = createTheme({
  primaryColor: 'brandBlue',
  primaryShade: { light: 6, dark: 5 },
  fontFamily: 'var(--font-sarabun), Sarabun, system-ui, sans-serif',
  headings: {
    fontFamily: 'var(--font-prompt), Prompt, system-ui, sans-serif',
    fontWeight: '700',
  },
  colors: { brandBlue },
  defaultRadius: 'md',
  components: {
    Button: { defaultProps: { radius: 'xl' } },
    Badge: { defaultProps: { radius: 'xl' } },
    Paper: { defaultProps: { shadow: 'sm', withBorder: true } },
  },
});
