"use client";

import { TextInput, type TextInputProps } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

type TableSearchInputProps = Omit<
  TextInputProps,
  "onChange"
> & {
  onSearch?: (value: string) => void;
};

function TableSearchInput({
  onSearch,
  ...props
}: TableSearchInputProps) {
  return (
    <TextInput
      leftSection={<IconSearch size={16} />}
      {...props}
      onChange={(event) => {
        const nextValue = event.currentTarget.value;
        onSearch?.(nextValue);
      }}
    />
  );
}

export default TableSearchInput;
