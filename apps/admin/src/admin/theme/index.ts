import {
  DEFAULT_THEME,
  createTheme,
  type MantineColorsTuple,
} from "@mantine/core";
import MantineBreakpoints from "./breakpoints";
import { components } from "./components";
import MantineShadows from "./shadows";

/**
 * Admin brand ramp. Shades 5-9 are intentionally identical to the public
 * site's `brandBlue` tuple (src/app/(web)/theme/index.ts), so swatches taken
 * from this range are safe to bake into stored content HTML.
 */
export const brandNavy: MantineColorsTuple = [
  "#eaf6ff",
  "#d2edfe",
  "#b8ddf2",
  "#8fc4e5",
  "#5fa6d0",
  "#2f80b7",
  "#035b98",
  "#0c4a86",
  "#0a3d6d",
  "#062d50",
];

export const adminTheme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 8 },
  fontFamily: "var(--font-sarabun), sans-serif",
  headings: {
    fontFamily: "var(--font-prompt), sans-serif",
    fontWeight: "700",
  },
  colors: {
    brand: brandNavy,
    danger: DEFAULT_THEME.colors.red,
    warning: DEFAULT_THEME.colors.orange,
    success: DEFAULT_THEME.colors.teal,
  },
  breakpoints: MantineBreakpoints,
  shadows: MantineShadows,
  spacing: {
    ...DEFAULT_THEME.spacing,
    "2xl": "calc(2.5rem * var(--mantine-scale))",
    "3xl": "calc(3rem * var(--mantine-scale))",
  },
  components: components,
});
