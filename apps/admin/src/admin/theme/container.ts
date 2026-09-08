// Container size constants in pixels
const CONTAINER_SIZE_XS = 570;
const CONTAINER_SIZE_SM = 770;
const CONTAINER_SIZE_MD = 970;
const CONTAINER_SIZE_LG = 1170;
const CONTAINER_SIZE_XL = 1470;

export type ContainerSizeKey = "xs" | "sm" | "md" | "lg" | "xl";

const CONTAINER_SIZES: Record<ContainerSizeKey, number> = {
  xs: CONTAINER_SIZE_XS,
  sm: CONTAINER_SIZE_SM,
  md: CONTAINER_SIZE_MD,
  lg: CONTAINER_SIZE_LG,
  xl: CONTAINER_SIZE_XL,
};

export default CONTAINER_SIZES;
