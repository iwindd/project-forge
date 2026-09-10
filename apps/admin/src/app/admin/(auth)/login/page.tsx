import { auth } from "@/auth";
import { Paper, Stack, Text, Title } from "@mantine/core";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import classes from "./login.module.css";

export default async function AdminLoginPage() {
  const t = await getTranslations("Auth");
  const session = await auth();

  if (session?.user?.id) {
    redirect("/account");
  }

  return (
    <main className={classes.page}>
      <Paper className={classes.panel} p={{ base: "xl", sm: "2xl" }}>
        <Stack gap={4} mb="xl" ta="start">
          <Title order={2}>{t("title")}</Title>
          <Text c="dimmed" size="sm">
            {t("description")}
          </Text>
        </Stack>
        <LoginForm />
      </Paper>
    </main>
  );
}
