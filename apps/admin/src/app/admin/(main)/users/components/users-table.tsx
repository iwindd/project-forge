"use client";


import {
  FilterResult,
  type FilterResultGroup,
  type FilterResultRemoveEvent,
} from "@/components/filter-result";
import { FilterTrigger } from "@/components/filter-trigger";
import TableSearchInput from "@/components/table-search-input";
import { useGetUsersQuery } from "@/lib/features/user/users-api";
import { useOrganizationContext } from "@/lib/features/organization/organization-provider";
import useDatatable from "@/hooks/use-datatable";
import { parseListUsersQuery } from "@/servers/user/queries/get-user-list-schema";
import type { UserListItem, UserListQuery } from "@/servers/user/types";
import {
  Alert,
  Badge,
  Combobox,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import { useFormatter } from "next-intl";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import classes from "./users-table.style.module.css";

const SORTABLE_FIELDS = [
  "name",
  "email",
  "role",
  "isActive",
  "createdAt",
] as const;

export function UsersTable() {
  const t = useTranslations("Users");
  const common = useTranslations("Common");
  const format = useFormatter();
  const { activeId: organizationId } = useOrganizationContext();
  const columns = useMemo(
    () => [
      {
        accessor: "name",
        title: common("name"),
        sortable: true,
        render: (record: UserListItem) => (
          <Text className={classes.nameLink}>
            {record.name}
          </Text>
        ),
      },
      { accessor: "email", title: common("email"), sortable: true },
      {
        accessor: "role",
        title: common("role"),
        sortable: true,
        render: (record: UserListItem) => (
          <Badge
            variant="light"
            color={record.role === "ADMIN" ? "blue" : "gray"}
          >
            {record.role === "ADMIN" ? common("admin") : common("editor")}
          </Badge>
        ),
      },
      {
        accessor: "isActive",
        title: common("status"),
        sortable: true,
        render: (record: UserListItem) => (
          <Badge color={record.isActive ? "green" : "red"} variant="light">
            {record.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
      {
        accessor: "createdAt",
        title: common("createdAt"),
        sortable: true,
        render: (record: UserListItem) => (
          <Text size="sm">
            {format.dateTime(new Date(record.createdAt), "date")}
          </Text>
        ),
      },
    ],
    [common, format, t],
  );

  const datatable = useDatatable<UserListItem, UserListQuery>({
    parseQueryAction: parseListUsersQuery,
    columns,
    sortableFields: SORTABLE_FIELDS,
  });
  const { query, setSearchValue, updateQuery } = datatable;
  const { data, isFetching, isError, refetch } = useGetUsersQuery(
    {
      organizationId: organizationId ?? "",
      query,
    },
    { skip: !organizationId },
  );
  const roleCombobox = useCombobox();
  const statusCombobox = useCombobox();

  const roleLabel = query.role
    ? query.role === "ADMIN"
      ? common("admin")
      : common("editor")
    : t("allRoles");
  const statusLabel =
    query.status === "active"
      ? t("active")
      : query.status === "inactive"
        ? t("inactive")
        : t("allStatuses");

  const filterGroups: FilterResultGroup[] = [
    {
      id: "search",
      label: t("search"),
      filters: query.search
        ? [
            {
              id: "query",
              label: query.search,
              removeLabel: t("deleteSearch"),
            },
          ]
        : [],
    },
    {
      id: "role",
      label: t("roles"),
      filters: query.role
        ? [
            {
              id: query.role,
              label: query.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้แก้ไข",
              removeLabel: t("deleteRole"),
            },
          ]
        : [],
    },
    {
      id: "status",
      label: common("status"),
      filters:
        query.status === "all"
          ? []
          : [
              {
                id: query.status,
                label: query.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน",
                removeLabel: t("deleteStatus"),
              },
            ],
    },
  ];

  const removeFilter = ({ groupId }: FilterResultRemoveEvent) => {
    if (groupId === "search") {
      setSearchValue.cancel();
      updateQuery({ search: undefined, page: 1 });
    } else if (groupId === "role") {
      updateQuery({ role: undefined, page: 1 });
    } else if (groupId === "status") {
      updateQuery({ status: "all", page: 1 });
    }
  };

  const clearFilters = () => {
    setSearchValue.cancel();
    updateQuery({ search: undefined, role: undefined, status: "all", page: 1 });
  };

  return (
    <Stack gap="lg">
      <Group className={classes.filters} justify="space-between">
        <div>
          <TableSearchInput
            className={classes.search}
            placeholder={t("searchPlaceholder")}
            key={query.search ?? ""}
            defaultValue={query.search ?? ""}
            onSearch={setSearchValue}
          />
        </div>
        <Group gap="sm" wrap="wrap">
          <Combobox
            store={roleCombobox}
            position="bottom-start"
            width={220}
            shadow="md"
            onOptionSubmit={(value) => {
              updateQuery({
                role: value === "all" ? undefined : value,
                page: 1,
              });
              roleCombobox.closeDropdown();
            }}
          >
            <Combobox.Target targetType="button">
              <FilterTrigger
                label={roleLabel}
                active={Boolean(query.role)}
                opened={roleCombobox.dropdownOpened}
                onClick={() => roleCombobox.toggleDropdown()}
              />
            </Combobox.Target>
            <Combobox.Dropdown>
              <Combobox.Options>
                <Combobox.Option
                  value="all"
                  active={!query.role}
                  style={
                    !query.role
                      ? {
                          backgroundColor: "var(--mantine-color-default-hover)",
                        }
                      : undefined
                  }
                >
                  <Group justify="space-between" wrap="nowrap">
                    <span>ทั้งหมด</span>
                    {!query.role ? <IconCheck size={16} /> : null}
                  </Group>
                </Combobox.Option>
                <Combobox.Option
                  value="EDITOR"
                  active={query.role === "EDITOR"}
                  style={
                    query.role === "EDITOR"
                      ? {
                          backgroundColor: "var(--mantine-color-default-hover)",
                        }
                      : undefined
                  }
                >
                  <Group justify="space-between" wrap="nowrap">
                    <span>ผู้แก้ไข</span>
                    {query.role === "EDITOR" ? <IconCheck size={16} /> : null}
                  </Group>
                </Combobox.Option>
                <Combobox.Option
                  value="ADMIN"
                  active={query.role === "ADMIN"}
                  style={
                    query.role === "ADMIN"
                      ? {
                          backgroundColor: "var(--mantine-color-default-hover)",
                        }
                      : undefined
                  }
                >
                  <Group justify="space-between" wrap="nowrap">
                    <span>ผู้ดูแลระบบ</span>
                    {query.role === "ADMIN" ? <IconCheck size={16} /> : null}
                  </Group>
                </Combobox.Option>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
          <Combobox
            store={statusCombobox}
            position="bottom-start"
            width={220}
            shadow="md"
            onOptionSubmit={(value) => {
              updateQuery({ status: value, page: 1 });
              statusCombobox.closeDropdown();
            }}
          >
            <Combobox.Target targetType="button">
              <FilterTrigger
                label={statusLabel}
                active={query.status !== "all"}
                opened={statusCombobox.dropdownOpened}
                onClick={() => statusCombobox.toggleDropdown()}
              />
            </Combobox.Target>
            <Combobox.Dropdown>
              <Combobox.Options>
                <Combobox.Option
                  value="all"
                  active={query.status === "all"}
                  style={
                    query.status === "all"
                      ? {
                          backgroundColor: "var(--mantine-color-default-hover)",
                        }
                      : undefined
                  }
                >
                  <Group justify="space-between" wrap="nowrap">
                    <span>ทั้งหมด</span>
                    {query.status === "all" ? <IconCheck size={16} /> : null}
                  </Group>
                </Combobox.Option>
                <Combobox.Option
                  value="active"
                  active={query.status === "active"}
                  style={
                    query.status === "active"
                      ? {
                          backgroundColor: "var(--mantine-color-default-hover)",
                        }
                      : undefined
                  }
                >
                  <Group justify="space-between" wrap="nowrap">
                    <span>เปิดใช้งาน</span>
                    {query.status === "active" ? <IconCheck size={16} /> : null}
                  </Group>
                </Combobox.Option>
                <Combobox.Option
                  value="inactive"
                  active={query.status === "inactive"}
                  style={
                    query.status === "inactive"
                      ? {
                          backgroundColor: "var(--mantine-color-default-hover)",
                        }
                      : undefined
                  }
                >
                  <Group justify="space-between" wrap="nowrap">
                    <span>ปิดใช้งาน</span>
                    {query.status === "inactive" ? (
                      <IconCheck size={16} />
                    ) : null}
                  </Group>
                </Combobox.Option>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        </Group>
      </Group>

      <FilterResult
        filters={filterGroups}
        onRemoveAction={removeFilter}
        onClearAllAction={clearFilters}
      />

      {isError ? (
        <Alert color="red" title="ไม่สามารถโหลดรายการผู้ใช้งานได้">
          <Button variant="light" size="xs" mt="sm" onClick={() => void refetch()}>
            ลองใหม่
          </Button>
        </Alert>
      ) : null}

      <Paper p={0}>
        <DataTable<UserListItem>
          {...datatable.props}
          fetching={isFetching}
          records={data?.data ?? []}
          columns={columns}
          totalRecords={data?.total ?? 0}
          noRecordsText={isFetching ? "กำลังโหลดรายการผู้ใช้งาน..." : "ไม่พบผู้ใช้งาน"}
        />
      </Paper>
    </Stack>
  );
}
