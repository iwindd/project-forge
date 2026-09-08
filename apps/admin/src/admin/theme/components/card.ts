import { Card as BaseCard } from "@mantine/core";

const Card = BaseCard.extend({
  defaultProps: {
    withBorder: true,
    shadow: "sm",
    bg: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
    p: "lg",
  },
});

export default Card;
