import { auth } from '@/auth'
import { AppProvider } from '@/components/providers/app-provider'
import { createPreloadedState } from '@/lib/store'
import type { ReactNode } from 'react'

export default async function AuthenticationLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  const session = await auth()
  const preloadedState = await createPreloadedState(
    { user: session?.user ?? null },
    []
  )

  return <AppProvider preloadedState={preloadedState}>{children}</AppProvider>
}
