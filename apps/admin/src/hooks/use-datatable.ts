"use client";

import { useDebouncedCallback } from "@mantine/hooks";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

type DatatableQuery = {
  page: number;
  pageSize: number;
  search?: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
};

type QueryUpdateValue = string | number | readonly string[] | undefined;

type UseDatatableOptions<T, Q extends DatatableQuery> = {
  parseQueryAction: (searchParams: URLSearchParams) => Q;
  columns: DataTableColumn<T>[];
  sortableFields?: readonly string[];
  recordsPerPageOptions?: number[];
  defaultProps?: DatatableDefaultProps;
};

type DatatableDefaultProps = {
  verticalSpacing?: string;
  recordsPerPageLabel?: string;
  noRecordsText?: string;
  highlightOnHover?: boolean;
  paginationText?: (params: {
    from: number;
    to: number;
    totalRecords: number;
  }) => React.ReactNode;
};

type DatatableProps<T> = {
  page: number;
  recordsPerPage: number;
  recordsPerPageOptions: number[];
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (pageSize: number) => void;
  sortStatus: DataTableSortStatus<T>;
  onSortStatusChange: (sortStatus: DataTableSortStatus<T>) => void;
  columns: DataTableColumn<T>[];
} & DatatableDefaultProps;

const DEFAULT_DATATABLE_PROPS: DatatableDefaultProps = {
  recordsPerPageLabel: "แสดงต่อหน้า",
  noRecordsText: "ไม่พบข้อมูล",
  highlightOnHover: true,
  verticalSpacing: "sm",
  paginationText: ({
    from,
    to,
    totalRecords,
  }: {
    from: number;
    to: number;
    totalRecords: number;
  }) => `${from} - ${to} จาก ${totalRecords} รายการ`,
};

export default function useDatatable<T, Q extends DatatableQuery>({
  parseQueryAction,
  columns,
  sortableFields,
  recordsPerPageOptions = [10, 25, 50],
  defaultProps,
}: UseDatatableOptions<T, Q>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => parseQueryAction(new URLSearchParams(searchParams.toString())),
    [parseQueryAction, searchParams],
  );
  const updateQuery = useCallback(
    (updates: Record<string, QueryUpdateValue>) => {
      const params = new URLSearchParams(window.location.search);

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.delete(key);
          for (const item of value) params.append(key, item);
        } else {
          params.set(key, String(value));
        }
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      // Next.js synchronizes native History API updates with useSearchParams
      // without starting an App Router navigation.
      window.history.replaceState(null, "", nextUrl);
    },
    [pathname],
  );

  const setSearchValue = useDebouncedCallback(
    (value: string) => {
      updateQuery({ search: value || undefined, page: 1 });
    },
    300,
  );

  const sortStatus = useMemo<DataTableSortStatus<T>>(
    () => ({
      columnAccessor: query.sortBy,
      direction: query.sortDirection,
    }),
    [query.sortBy, query.sortDirection],
  );

  const setPage = useCallback(
    (nextPage: number) => updateQuery({ page: nextPage }),
    [updateQuery],
  );

  const setPageSize = useCallback(
    (nextPageSize: number) => updateQuery({ pageSize: nextPageSize, page: 1 }),
    [updateQuery],
  );

  const setSortStatus = useCallback(
    (nextSortStatus: DataTableSortStatus<T>) => {
      const columnAccessor = String(nextSortStatus.columnAccessor);
      if (sortableFields && !sortableFields.includes(columnAccessor)) {
        return;
      }

      updateQuery({
        sortBy: columnAccessor,
        sortDirection: nextSortStatus.direction,
        page: 1,
      });
    },
    [sortableFields, updateQuery],
  );

  const props = useMemo<DatatableProps<T>>(
    () => ({
      page: query.page,
      recordsPerPage: query.pageSize,
      recordsPerPageOptions,
      onPageChange: setPage,
      onRecordsPerPageChange: setPageSize,
      sortStatus,
      onSortStatusChange: setSortStatus,
      columns,
      ...DEFAULT_DATATABLE_PROPS,
      ...defaultProps,
    }),
    [
      columns,
      query.page,
      query.pageSize,
      recordsPerPageOptions,
      setPage,
      setPageSize,
      setSortStatus,
      sortStatus,
      defaultProps,
    ],
  );

  return {
    query,
    setSearchValue,
    updateQuery,
    page: query.page,
    pageSize: query.pageSize,
    sortStatus,
    setPage,
    setPageSize,
    setSortStatus,
    props,
  };
}
