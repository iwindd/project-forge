"use client";

import { Badge, Button, Group } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { forwardRef } from "react";
import classes from "./filter-trigger.module.css";

export type FilterTriggerProps = {
  label: React.ReactNode;
  active?: boolean;
  opened?: boolean;
  additionalCount?: number;
  fullWidth?: boolean;
  onClick?: () => void;
};

export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger(
    {
      label,
      active = false,
      opened = false,
      additionalCount = 0,
      fullWidth = false,
      onClick,
    },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        type="button"
        variant="default-subtle"
        color="gray"
        className={classes.root}
        fullWidth={fullWidth}
        data-active={active || undefined}
        data-opened={opened || undefined}
        onClick={onClick}
        rightSection={
          <Group gap={4} wrap="nowrap">
            {additionalCount > 0 ? (
              <Badge size="xs" variant="default" className={classes.count}>
                +{additionalCount}
              </Badge>
            ) : null}
            <span className={classes.chevron}>
              <IconChevronDown size={14} />
            </span>
          </Group>
        }
      >
        {label}
      </Button>
    );
  },
);
