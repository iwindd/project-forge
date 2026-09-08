import { Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import classes from "./page-header.style.module.css";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: ReactNode;
  backTo?: string;
  rightSection?: ReactNode;
};

function renderTitle(title: ReactNode) {
  return typeof title === "string" ? <Title order={3}>{title}</Title> : title;
}

function renderSubtitle(subtitle: ReactNode) {
  return typeof subtitle === "string" ? (
    <Text size="sm" c="dimmed">
      {subtitle}
    </Text>
  ) : (
    subtitle
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  backTo,
  rightSection,
}: PageHeaderProps) {
  const t = useTranslations("Common");
  const titleContent = renderTitle(title);

  return (
    <Stack className={classes.root} gap="sm">
      {backTo && (
        <Button
          component={Link}
          href={backTo}
          variant="default-subtle"
          className={classes.backButton}
          leftSection={<IconArrowLeft size={17} aria-hidden="true" />}
          w="fit-content"
        >
          {t("back")}
        </Button>
      )}
      <Group align="flex-start" justify="space-between" gap="lg" wrap="wrap">
        <Stack className={classes.content} gap={4}>
          {titleContent}
          {subtitle !== undefined && renderSubtitle(subtitle)}
          {breadcrumbs}
        </Stack>
        {rightSection && (
          <Box className={classes.rightSection}>{rightSection}</Box>
        )}
      </Group>
    </Stack>
  );
}
