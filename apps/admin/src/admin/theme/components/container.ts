import { Container as BaseContainer, rem } from "@mantine/core";
import CONTAINER_SIZES, { ContainerSizeKey } from "../container";

/**
 * Calculates the appropriate container size based on fluid mode and size parameter
 * @param fluid - Whether the container should be fluid (100% width)
 * @param size - The container size key or custom size value
 * @returns The calculated container size as a CSS value
 */
const calculateContainerSize = (fluid?: boolean, size?: unknown): string => {
  if (fluid) {
    return "100%";
  }

  if (
    size !== undefined &&
    typeof size === "string" &&
    size in CONTAINER_SIZES
  ) {
    return rem(CONTAINER_SIZES[size as ContainerSizeKey]);
  }

  if (typeof size === "number") {
    return rem(size);
  }

  return "100%";
};

const Container = BaseContainer.extend({
  vars: (_, { size, fluid }) => ({
    root: {
      "--container-size": calculateContainerSize(fluid, size),
    },
  }),
  defaultProps: {
    size: "xl",
  },
});

export default Container;
