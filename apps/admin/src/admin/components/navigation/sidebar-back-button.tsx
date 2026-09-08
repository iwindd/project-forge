"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import classes from "./sidebar-back-button.module.css";

export function SidebarBackButton({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const t = useTranslations("Common");

  return (
    <Link
      href={`/${encodeURIComponent(organizationSlug)}`}
      className={classes.control}
      aria-label={t("back")}
    >
      <IconArrowLeft size={18} stroke={1.8} aria-hidden="true" />
      <span>{t("back")}</span>
    </Link>
  );
}
