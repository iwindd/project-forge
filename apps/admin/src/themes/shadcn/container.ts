import { rem } from '@mantine/core';

export type ContainerSizeKey = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const CONTAINER_SIZES: Record<ContainerSizeKey, string> = {
  xxs: rem('200px'),
  xs: rem('300px'),
  sm: rem('400px'),
  md: rem('500px'),
  lg: rem('600px'),
  xl: rem('1400px'),
  xxl: rem('1600px'),
};

export default CONTAINER_SIZES;
