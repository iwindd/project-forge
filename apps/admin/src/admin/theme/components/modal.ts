import { MantineThemeComponents } from "@mantine/core";

const Modal = {
  defaultProps: {
    overlayProps: {
      backgroundOpacity: 0.55,
      blur: 6,
    },
    shadow: "xl",
  },
  styles: {
    header: {
      backgroundColor:
        "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
    },
    title: {
      fontWeight: 500,
      fontSize: "var(--mantine-font-size-md)",
    },
  },
} satisfies MantineThemeComponents["Modal"];

export default Modal;
