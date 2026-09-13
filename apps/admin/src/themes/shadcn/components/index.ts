import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Blockquote,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  Indicator,
  type MantineThemeOverride,
  Mark,
  NavLink,
  Pagination,
  Paper,
  Radio,
  SegmentedControl,
  Select,
  Stepper,
  Switch,
  ThemeIcon,
  Timeline,
  Tooltip,
} from '@mantine/core';
import Container from './container';

export const components = {
  Container,
  Checkbox: Checkbox.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      return {
        root: {
          '--checkbox-color': colorKey
            ? `var(--mantine-color-${colorKey}-filled)`
            : 'var(--mantine-primary-color-filled)',

          '--checkbox-icon-color': colorKey
            ? `var(--mantine-color-${colorKey}-contrast)`
            : 'var(--mantine-primary-color-contrast)',
        },
      };
    },
  }),
  Chip: Chip.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const variant = props.variant ?? 'filled';
      return {
        root: {
          '--chip-bg':
            variant !== 'light'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-filled)`
                : 'var(--mantine-primary-color-filled)'
              : undefined,
          '--chip-color':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : 'var(--mantine-primary-color-contrast)'
              : undefined,
        },
      };
    },
  }),
  Radio: Radio.extend({
    vars: (theme, props) => ({
      root: {
        '--radio-color': props.color
          ? Object.keys(theme.colors).includes(props.color)
            ? `var(--mantine-color-${props.color}-filled)`
            : props.color
          : 'var(--mantine-primary-color-filled)',

        '--radio-icon-color': props.color
          ? Object.keys(theme.colors).includes(props.color)
            ? `var(--mantine-color-${props.color}-contrast)`
            : props.color
          : 'var(--mantine-primary-color-contrast)',
      },
    }),
  }),
  SegmentedControl: SegmentedControl.extend({
    vars: (theme, props) => ({
      root: {
        '--sc-color': props.color
          ? Object.keys(theme.colors).includes(props.color)
            ? ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(props.color)
              ? 'var(--mantine-color-body)'
              : `var(--mantine-color-${props.color}-filled)`
            : props.color
          : 'var(--mantine-color-default)',
      },
    }),
  }),
  Switch: Switch.extend({
    styles: () => ({
      thumb: {
        backgroundColor: 'var(--mantine-color-default)',
        borderColor: 'var(--mantine-color-default-border)',
      },
      track: {
        borderColor: 'var(--mantine-color-default-border)',
      },
    }),
  }),
  Select: Select.extend({
    defaultProps: {
      checkIconPosition: 'right',
    },
  }),
  ActionIcon: ActionIcon.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      const isNeutralPrimaryColor =
        !colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(theme.primaryColor);
      const variant = props.variant ?? 'filled';
      const isDefaultSubtle = variant === 'subtle' && !props.color;

      return {
        root: {
          '--ai-bg': isDefaultSubtle ? 'transparent' : undefined,
          '--ai-hover': isDefaultSubtle ? 'var(--mantine-color-default-hover)' : undefined,
          '--ai-bd': isDefaultSubtle ? 'transparent' : undefined,
          '--ai-color': isDefaultSubtle
            ? 'var(--mantine-color-default-color, var(--mantine-color-text))'
            : (() => {
                if (variant === 'filled') {
                  if (colorKey) {
                    return `var(--mantine-color-${colorKey}-contrast)`;
                  }
                  return 'var(--mantine-primary-color-contrast)';
                }
                if (variant === 'white') {
                  if (isNeutralColor || isNeutralPrimaryColor) {
                    return 'var(--mantine-color-black)';
                  }
                  return undefined;
                }
                return undefined;
              })(),
          '--ai-hover-color': isDefaultSubtle
            ? 'var(--mantine-color-default-color, var(--mantine-color-text))'
            : undefined,
        },
      };
    },
  }),
  Button: Button.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      const isNeutralPrimaryColor =
        !colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(theme.primaryColor);
      const variant = props.variant ?? 'filled';
      return {
        root: {
          '--button-color': (() => {
            if (variant === 'filled') {
              if (colorKey) {
                return `var(--mantine-color-${colorKey}-contrast)`;
              }
              return 'var(--mantine-primary-color-contrast)';
            }
            if (variant === 'white') {
              if (isNeutralColor || isNeutralPrimaryColor) {
                return 'var(--mantine-color-black)';
              }
              return undefined;
            }
            return undefined;
          })(),
        },
      };
    },
  }),
  Anchor: Anchor.extend({
    defaultProps: {
      underline: 'always',
    },
  }),
  NavLink: NavLink.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const variant = props.variant ?? 'light';
      return {
        root: {
          '--nl-color':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : 'var(--mantine-primary-color-contrast)'
              : undefined,
        },
        children: {},
      };
    },
  }),
  Pagination: Pagination.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      return {
        root: {
          '--pagination-active-color': colorKey
            ? `var(--mantine-color-${colorKey}-contrast)`
            : 'var(--mantine-primary-color-contrast)',
        },
      };
    },
  }),
  Stepper: Stepper.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      return {
        root: {
          '--stepper-icon-color': colorKey
            ? `var(--mantine-color-${colorKey}-contrast)`
            : 'var(--mantine-primary-color-contrast)',
        },
      };
    },
  }),
  Alert: Alert.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      const isNeutralPrimaryColor =
        !colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(theme.primaryColor);
      const variant = props.variant ?? 'light';
      return {
        root: {
          '--alert-color':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : 'var(--mantine-primary-color-contrast)'
              : variant === 'white'
                ? isNeutralColor || isNeutralPrimaryColor
                  ? `var(--mantine-color-black)`
                  : undefined
                : undefined,
        },
      };
    },
  }),
  Dialog: Dialog.extend({
    defaultProps: {
      withBorder: true,
    },
  }),
  Tooltip: Tooltip.extend({
    vars: () => ({
      tooltip: {
        '--tooltip-bg': 'var(--mantine-primary-color-filled)',
        '--tooltip-color': 'var(--mantine-primary-color-contrast)',
      },
    }),
  }),
  Avatar: Avatar.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      const isNeutralPrimaryColor =
        !colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(theme.primaryColor);
      const variant = props.variant ?? 'light';
      return {
        root: {
          '--avatar-bg':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-filled)`
                : 'var(--mantine-primary-color-filled)'
              : variant === 'light'
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-light)`
                  : 'var(--mantine-primary-color-light)'
                : undefined,

          '--avatar-color':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : 'var(--mantine-primary-color-contrast)'
              : variant === 'light'
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-light-color)`
                  : 'var(--mantine-primary-color-light-color)'
                : variant === 'white'
                  ? isNeutralColor || isNeutralPrimaryColor
                    ? `var(--mantine-color-black)`
                    : colorKey
                      ? `var(--mantine-color-${colorKey}-outline)`
                      : 'var(--mantine-primary-color-filled)'
                  : variant === 'outline' || variant === 'transparent'
                    ? colorKey
                      ? `var(--mantine-color-${colorKey}-outline)`
                      : 'var(--mantine-primary-color-filled)'
                    : undefined,

          '--avatar-bd':
            variant === 'outline'
              ? colorKey
                ? `1px solid var(--mantine-color-${colorKey}-outline)`
                : '1px solid var(--mantine-primary-color-filled)'
              : undefined,
        },
      };
    },
  }),
  Badge: Badge.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      const isNeutralPrimaryColor =
        !colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(theme.primaryColor);
      const variant = props.variant ?? 'filled';
      return {
        root: {
          '--badge-bg': variant === 'filled' && colorKey ? `var(--mantine-color-${colorKey}-filled)` : undefined,
          '--badge-color':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : 'var(--mantine-primary-color-contrast)'
              : variant === 'white'
                ? isNeutralColor || isNeutralPrimaryColor
                  ? `var(--mantine-color-black)`
                  : undefined
                : undefined,
        },
      };
    },
  }),
  Card: Card.extend({
    defaultProps: {
      p: 'xl',
      shadow: 'xl',
      withBorder: true,
    },
    styles: (theme) => {
      return {
        root: {
          backgroundColor:
            theme.primaryColor === 'rose' || theme.primaryColor === 'green'
              ? 'var(--mantine-color-secondary-filled)'
              : undefined,
        },
      };
    },
  }),
  Indicator: Indicator.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      return {
        root: {
          '--indicator-text-color': colorKey
            ? `var(--mantine-color-${colorKey}-contrast)`
            : 'var(--mantine-primary-color-contrast)',
        },
      };
    },
  }),
  ThemeIcon: ThemeIcon.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      const isNeutralPrimaryColor =
        !colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(theme.primaryColor);

      const variant = props.variant ?? 'filled';
      return {
        root: {
          '--ti-color':
            variant === 'filled'
              ? colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : 'var(--mantine-primary-color-contrast)'
              : variant === 'white'
                ? isNeutralColor || isNeutralPrimaryColor
                  ? `var(--mantine-color-black)`
                  : undefined
                : undefined,
        },
      };
    },
  }),
  Timeline: Timeline.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      return {
        root: {
          '--tl-icon-color': colorKey
            ? `var(--mantine-color-${colorKey}-contrast)`
            : 'var(--mantine-primary-color-contrast)',
        },
      };
    },
  }),
  Blockquote: Blockquote.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
      return {
        root: {
          '--bq-bg-dark': colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
          '--bq-bg-light': colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
        },
      };
    },
  }),
  Mark: Mark.extend({
    vars: (theme, props) => {
      const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : 'yellow';
      const isNeutralColor = colorKey && ['zinc', 'slate', 'gray', 'neutral', 'stone'].includes(colorKey);
      return {
        root: {
          '--mark-bg-light': `var(--mantine-color-${colorKey}-${isNeutralColor ? '3' : 'filled-hover'})`,
          '--mark-bg-dark': `var(--mantine-color-${colorKey}-filled)`,
        },
      };
    },
  }),
  Paper: Paper.extend({
    defaultProps: {
      shadow: 'xl',
    },
  }),
} satisfies MantineThemeOverride['components'];
