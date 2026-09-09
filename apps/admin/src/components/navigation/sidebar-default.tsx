'use client'

import { OrganizationSwitcher } from '@/lib/features/organization/organization-switcher'
import type { AdminUser } from '@/session'
import { Box, ScrollArea } from '@mantine/core'
import { useRef } from 'react'
import NavigationScrollControls from './navigation-scroll-controls'
import type { SidebarNavigationMode } from './navigation-utils'
import { SidebarBackButton } from './sidebar-back-button'
import classes from './sidebar-default.module.css'
import SidebarNavContent from './sidebar-nav-content'
import { SidebarUserMenu } from './sidebar-user-menu'
import { useScrollbarVisibility } from './use-scrollbar-visibility'

export default function SidebarDefault({
  user,
  organizationSlug,
  navigationMode = 'app',
  onNavigateAction
}: {
  user: AdminUser
  organizationSlug: string
  navigationMode?: SidebarNavigationMode
  onNavigateAction?: () => void
}) {
  const showBackButton =
    navigationMode === 'account' || navigationMode === 'admin'
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrollbar = useScrollbarVisibility()
  const scrollbarClassName = `${classes.navigationScrollbar} ${scrollbar.visible ? classes.navigationScrollbarVisible : ''}`

  return (
    <aside className={classes.sidebar}>
      <div className={classes.sidebarHeader}>
        {showBackButton ? (
          <SidebarBackButton organizationSlug={organizationSlug} />
        ) : (
          <OrganizationSwitcher />
        )}
      </div>

      <NavigationScrollControls
        orientation='vertical'
        viewportRef={viewportRef}
      >
        <ScrollArea
          className={classes.iconSidebarScroll}
          classNames={{
            scrollbar: scrollbarClassName,
            thumb: classes.navigationScrollbarThumb
          }}
          onMouseEnter={scrollbar.showThenHide}
          onMouseLeave={scrollbar.hide}
          onScrollPositionChange={scrollbar.showThenHide}
          scrollbars='y'
          scrollbarSize={10}
          scrollHideDelay={500}
          type='always'
          viewportRef={viewportRef}
        >
          <Box px='xs'>
            <SidebarNavContent
              navigationMode={navigationMode}
              onNavigateAction={onNavigateAction}
            />
          </Box>
        </ScrollArea>
      </NavigationScrollControls>

      <div className={classes.sidebarFooter}>
        <SidebarUserMenu user={user} />
      </div>
    </aside>
  )
}
