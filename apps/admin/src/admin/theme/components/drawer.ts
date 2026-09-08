import { Drawer as BaseDrawer } from "@mantine/core";

const backgroundColor =
  "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))";

const Drawer = BaseDrawer.extend({
  styles: {
    content: { backgroundColor },
    header: { backgroundColor },
  },
});

export default Drawer;
