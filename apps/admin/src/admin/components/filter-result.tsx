"use client";

import { Button, Pill, Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import classes from "./filter-result.module.css";

type FilterResultItem = {
  id: string;
  label: React.ReactNode;
  removeLabel: string;
};

export type FilterResultGroup = {
  id: string;
  label: React.ReactNode;
  filters: FilterResultItem[];
};

export type FilterResultRemoveEvent = {
  groupId: string;
  filterId: string;
};

export type FilterResultProps = {
  filters: FilterResultGroup[];
  onRemoveAction: (event: FilterResultRemoveEvent) => void;
  onClearAllAction: () => void;
};

export function FilterResult({
  filters,
  onRemoveAction,
  onClearAllAction,
}: FilterResultProps) {
  const activeGroups = filters.filter((group) => group.filters.length > 0);

  if (activeGroups.length === 0) return null;

  return (
    <Stack className={classes.root} gap="sm">
      <div className={classes.groups}>
        {activeGroups.map((group) => (
          <div key={group.id} className={classes.group}>
            <span className={classes.label}>{group.label}:</span>
            <Pill.Group className={classes.pills}>
              {group.filters.map((filter) => (
                <Pill
                  key={filter.id}
                  withRemoveButton
                  onRemove={() =>
                    onRemoveAction({ groupId: group.id, filterId: filter.id })
                  }
                  removeButtonProps={{ "aria-label": filter.removeLabel }}
                >
                  {filter.label}
                </Pill>
              ))}
            </Pill.Group>
          </div>
        ))}
        <Button
          type="button"
          variant="subtle"
          color="danger"
          className={classes.clear}
          leftSection={<IconTrash size={16} />}
          onClick={onClearAllAction}
        >
          ล้าง
        </Button>
      </div>
    </Stack>
  );
}
