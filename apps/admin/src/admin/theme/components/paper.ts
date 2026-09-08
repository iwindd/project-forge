import { Paper as BasePaper } from "@mantine/core";

const Paper = BasePaper.extend({
  defaultProps: {
    shadow: "md",
  },
  styles: {
    root: {
      backgroundColor:
        "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
      border: "1px solid light-dark(var(--mantine-color-gray-2), transparent)",
    },
  },
});

export default Paper;
