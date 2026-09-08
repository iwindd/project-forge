import { Tabs as BaseTabs } from "@mantine/core";
import classes from "./tabs.module.css";

const Tabs = BaseTabs.extend({
  classNames: classes,
  defaultProps: {
    variant: "underline",
  },
});

export default Tabs;
