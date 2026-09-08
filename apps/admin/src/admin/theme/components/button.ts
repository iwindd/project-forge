import { Button as BaseButton } from "@mantine/core";
import classes from "./button.module.css";

const Button = BaseButton.extend({
  classNames: classes,
  defaultProps: {
    variant: "contrast",
    radius: "md",
  },
  styles: {
    label: {
      fontWeight: 500,
    },
  },
  vars: (theme, props) => {
    if (props.variant === "default-subtle") {
      return {
        root: {
          "--button-bg": "transparent",
          "--button-hover": "var(--mantine-color-default-hover)",
          "--button-bd": "transparent",
          "--button-color": "var(--mantine-color-default-color, var(--mantine-color-text))",
          "--button-hover-color": "var(--mantine-color-default-color, var(--mantine-color-text))",
        },
      };
    }
    return { root: {} };
  },
});

export default Button;
