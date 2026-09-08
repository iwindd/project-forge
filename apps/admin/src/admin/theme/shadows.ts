import { MantineThemeOverride } from "@mantine/core";

const MantineShadows = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
} satisfies MantineThemeOverride["shadows"];

export default MantineShadows;
