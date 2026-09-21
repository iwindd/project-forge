'use client';

import { Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import classes from './sidebar-back-button.module.css';

export function SidebarBackButton({ organizationSlug, href }: { organizationSlug?: string; href?: string }) {
  const t = useTranslations('Common');
  const targetHref = href ?? (organizationSlug ? `/${encodeURIComponent(organizationSlug)}` : '/');

  return (
    <Link
      href={targetHref}
      className={classes.control}
      aria-label={t('back')}
    >
      <IconArrowLeft size={22} stroke={1.8} aria-hidden='true' />
      <Text size='sm' fw={500}>
        {t('back')}
      </Text>
    </Link>
  );
}
