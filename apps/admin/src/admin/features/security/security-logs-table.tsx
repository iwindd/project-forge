"use client";

import { Alert, Loader, Paper, Table, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { addOrganizationHeader, getActiveOrganizationId } from "../organization/organization-context";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

type SecurityLog = {
  id: string;
  event: string;
  provider: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export function SecurityLogsTable({ userId }: { userId?: string }) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const organizationId = getActiveOrganizationId();
    const endpoint = userId
      ? organizationId
        ? `/api/v1/audit-logs/security/organization/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(userId)}`
        : null
      : "/api/v1/audit-logs/security/me";
    if (!endpoint) {
      const timer = window.setTimeout(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }
    void fetch(`${apiOrigin}${endpoint}`, {
      credentials: "include",
      cache: "no-store",
      headers: addOrganizationHeader(new Headers()),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("security logs request failed");
        return (await response.json()) as { data: SecurityLog[] };
      })
      .then((result) => {
        if (active) setLogs(result.data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) return <Loader />;
  if (error) return <Alert color="red">ไม่สามารถโหลด security logs ได้</Alert>;

  return (
    <Paper withBorder p="md">
      <Text fw={600} mb="sm">ประวัติความปลอดภัยของบัญชี</Text>
      <Table.ScrollContainer minWidth={760}>
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>เหตุการณ์</Table.Th><Table.Th>Provider</Table.Th><Table.Th>IP</Table.Th><Table.Th>เวลา</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {logs.map((log) => <Table.Tr key={log.id}><Table.Td>{log.event}</Table.Td><Table.Td>{log.provider ?? "-"}</Table.Td><Table.Td>{log.ipAddress ?? "-"}</Table.Td><Table.Td>{new Date(log.createdAt).toLocaleString("th-TH")}</Table.Td></Table.Tr>)}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
