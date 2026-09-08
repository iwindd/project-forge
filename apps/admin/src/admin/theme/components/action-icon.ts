import { ActionIcon as BaseActionIcon } from "@mantine/core";

const ActionIcon = BaseActionIcon.extend({
  vars: (theme, props) => {
    if (props.variant === "default-subtle") {
      return {
        root: {
          "--ai-bg": "transparent",
          "--ai-hover": "var(--mantine-color-default-hover)",
          "--ai-bd": "transparent",
          "--ai-color": "var(--mantine-color-default-color, var(--mantine-color-text))",
          "--ai-hover-color": "var(--mantine-color-default-color, var(--mantine-color-text))",
        },
      };
    }
    return { root: {} };
  },
});

export default ActionIcon;
