'use client'

import { Anchor, Breadcrumbs, Text } from '@mantine/core'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useActiveRouteTrail } from '@/hooks'
import { getPath } from '@/routes'
import type { RouteParams } from '@/lib/routing'

type AppBreadcrumbsProps = {
  currentLabel?: ReactNode
  /**
   * Includes routes marked `hiddenBreadcrumb` as plain text.
   */
  withHiddenRoots?: boolean
}

export function AppBreadcrumbs({
  currentLabel,
  withHiddenRoots = false
}: AppBreadcrumbsProps) {
  const fullTrail = useActiveRouteTrail()
  const trail = withHiddenRoots
    ? fullTrail
    : fullTrail.filter(route => !route.hiddenBreadcrumb)
  const params = useParams() as RouteParams
  const t = useTranslations('Common')
  const nav = useTranslations('Navigation')

  if (trail.length === 0) {
    return null
  }

  return (
    <Breadcrumbs separator='/' aria-label={t('navigation')}>
      {trail.map((route, index) => {
        const isCurrent = index === trail.length - 1
        const label =
          isCurrent && currentLabel !== undefined
            ? currentLabel
            : route.name === 'auditLogs'
              ? nav('auditLogs')
              : route.label
        // A hidden root has no page of its own, so it never becomes a link.
        const href =
          route.disabled ||
          route.hiddenBreadcrumb ||
          route.disableBreadcrumbLink
            ? undefined
            : getPath(route.name, params)

        if (isCurrent || !href) {
          return (
            <Text key={route.name} size='xs' c={isCurrent ? 'dark' : 'dimmed'}>
              {label}
            </Text>
          )
        }

        return (
          <Anchor key={route.name} component={Link} href={href} size='xs'>
            {label}
          </Anchor>
        )
      })}
    </Breadcrumbs>
  )
}
