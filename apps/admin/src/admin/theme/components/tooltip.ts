import { MantineThemeComponents } from "@mantine/core";

const Tooltip = {
  defaultProps: {
    withArrow: true,
    arrowSize: 6,
    offset: 6,
  },
  styles: {
    tooltip: {
      padding: "4px 8px",
      fontSize: "var(--mantine-font-size-xs)",
      fontWeight: 700,
      lineHeight: 1,
      backgroundColor:
        "light-dark(var(--mantine-color-dark-8), var(--mantine-color-gray-7))",
      color: "var(--mantine-color-white)",
    },
  },
} satisfies MantineThemeComponents["Tooltip"];

export default Tooltip;
