'use client'

import { OrganizationSwitcher } from '@/lib/features/organization/organization-switcher'
import type { AdminUser } from '@/session'
import { Box, Drawer, ScrollArea } from '@mantine/core'
import { useRef } from 'react'
import NavigationScrollControls from './navigation-scroll-controls'
import type { SidebarNavigationMode } from './navigation-utils'
import { SidebarBackButton } from './sidebar-back-button'
import { SIDEBAR_WIDTH } from './sidebar-constants'
import classes from './sidebar-drawer.module.css'
import SidebarNavContent from './sidebar-nav-content'
import { SidebarUserMenu } from './sidebar-user-menu'
import { useScrollbarVisibility } from './use-scrollbar-visibility'

type SidebarDrawerProps = {
  opened: boolean
  onCloseAction: () => void
  user: AdminUser
  organizationSlug: string
  navigationMode?: SidebarNavigationMode
}

export default function SidebarDrawer({
  opened,
  onCloseAction,
  user,
  organizationSlug,
  navigationMode = 'admin'
}: SidebarDrawerProps) {
  const showBackButton =
    navigationMode === 'account' || navigationMode === 'admin-root'
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrollbar = useScrollbarVisibility()
  const scrollbarClassName = `${classes.navigationScrollbar} ${scrollbar.visible ? classes.navigationScrollbarVisible : ''}`

  return (
    <Drawer
      opened={opened}
      onClose={onCloseAction}
      padding={0}
      position='left'
      size={SIDEBAR_WIDTH}
      title={
        showBackButton ? (
          <SidebarBackButton organizationSlug={organizationSlug} />
        ) : (
          <OrganizationSwitcher />
        )
      }
      hiddenFrom='sm'
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      classNames={{
        body: classes.mobileDrawerBody,
        content: classes.mobileDrawerContent
      }}
    >
      <div className={classes.mobileDrawerSidebar}>
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
            <Box px='md'>
              <SidebarNavContent
                navigationMode={navigationMode}
                onNavigateAction={onCloseAction}
              />
            </Box>
          </ScrollArea>
        </NavigationScrollControls>

        <div className={classes.sidebarFooter}>
          <SidebarUserMenu user={user} />
        </div>
      </div>
    </Drawer>
  )
}
