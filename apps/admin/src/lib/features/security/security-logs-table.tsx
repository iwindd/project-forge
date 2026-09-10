"use client";

import { Alert, Button, Loader, Paper, Table, Text } from "@mantine/core";
import { useFormatter } from "next-intl";
import { useGetSecurityLogsQuery } from "./security-api";
import { useOptionalOrganizationContext } from "../organization/organization-provider";

export function SecurityLogsTable({ userId }: { userId?: string }) {
  const format = useFormatter();
  const organizationContext = useOptionalOrganizationContext();
  const organizationId = organizationContext?.activeId;
  const missingOrganizationScope = Boolean(userId && !organizationId);
  const { data, isLoading, isError, refetch } = useGetSecurityLogsQuery(
    { organizationId: organizationId ?? undefined, userId },
    { skip: missingOrganizationScope }
  );
  const logs = data?.data ?? [];
  const formatCreatedAt = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : format.dateTime(date, "dateTime");
  };

  if (missingOrganizationScope) {
    return <Alert color="red">ไม่สามารถโหลด security logs ได้</Alert>;
  }
  if (isError) {
    return (
      <Alert color="red" title="ไม่สามารถโหลด security logs ได้">
        <Button variant="light" size="xs" mt="sm" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </Alert>
    );
  }
  if (isLoading) return <Loader />;

  return (
    <Paper withBorder p="md">
      <Text fw={600} mb="sm">ประวัติความปลอดภัยของบัญชี</Text>
      <Table.ScrollContainer minWidth={760}>
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>เหตุการณ์</Table.Th><Table.Th>Provider</Table.Th><Table.Th>IP</Table.Th><Table.Th>เวลา</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {logs.length ? logs.map((log) => <Table.Tr key={log.id}><Table.Td>{log.event}</Table.Td><Table.Td>{log.provider ?? "-"}</Table.Td><Table.Td>{log.ipAddress ?? "-"}</Table.Td><Table.Td>{formatCreatedAt(log.createdAt)}</Table.Td></Table.Tr>) : (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">ไม่พบประวัติความปลอดภัย</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
