import { createTheme, type MantineThemeOverride, rem } from '@mantine/core';
import { SHADCN_COLORS } from './colors';
import { components } from './components';

export const shadcnTheme: MantineThemeOverride = createTheme({
  colors: SHADCN_COLORS,
  focusRing: 'never',
  scale: 1,
  primaryColor: 'primary',
  primaryShade: { light: 8, dark: 0 },
  autoContrast: true,
  luminanceThreshold: 0.3,
  fontFamily: 'var(--font-sarabun), sans-serif',
  radius: {
    xs: rem('6px'),
    sm: rem('8px'),
    md: rem('12px'),
    lg: rem('16px'),
    xl: rem('24px'),
  },
  defaultRadius: 'sm',
  spacing: {
    '4xs': rem('2px'),
    '3xs': rem('4px'),
    '2xs': rem('8px'),
    xs: rem('10px'),
    sm: rem('12px'),
    md: rem('16px'),
    lg: rem('20px'),
    xl: rem('24px'),
    '2xl': rem('28px'),
    '3xl': rem('32px'),
    '4xl': rem('40px'),
  },
  fontSizes: {
    xs: rem('12px'),
    sm: rem('14px'),
    md: rem('16px'),
    lg: rem('18px'),
    xl: rem('20px'),
    '2xl': rem('24px'),
    '3xl': rem('30px'),
    '4xl': rem('36px'),
    '5xl': rem('48px'),
  },
  lineHeights: {
    xs: rem('18px'),
    sm: rem('20px'),
    md: rem('24px'),
    lg: rem('28px'),
  },

  headings: {
    fontFamily: 'var(--font-sarabun)',
    sizes: {
      h1: {
        fontSize: rem('36px'),
        lineHeight: rem('44px'),
        fontWeight: '600',
      },
      h2: {
        fontSize: rem('30px'),
        lineHeight: rem('38px'),
        fontWeight: '600',
      },
      h3: {
        fontSize: rem('24px'),
        lineHeight: rem('32px'),
        fontWeight: '600',
      },
      h4: {
        fontSize: rem('20px'),
        lineHeight: rem('30px'),
        fontWeight: '600',
      },
    },
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px rgba(0, 0, 0, 0.25)',
  },

  cursorType: 'pointer',
  other: {
    style: 'shadcn',
  },
  components: components,
});
