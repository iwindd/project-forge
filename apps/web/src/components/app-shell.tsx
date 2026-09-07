'use client'

import { ApiError, apiFetch, getMe, type User } from '@/lib/api'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function AppShell({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getMe()
      .then(({ user: current }) => {
        if (!active) return
        if (current.accessStatus !== 'APPROVED') {
          router.replace(
            current.accessStatus === 'PENDING'
              ? '/access-pending'
              : '/access-blocked'
          )
          return
        }
        if (pathname.startsWith('/admin') && current.role !== 'ADMIN') {
          setError('หน้านี้สำหรับผู้ดูแลระบบเท่านั้น')
          router.replace('/projects')
          return
        }
        setUser(current)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 401)
          router.replace('/login')
        else
          setError(
            cause instanceof Error ? cause.message : 'ไม่สามารถโหลด session ได้'
          )
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [pathname, router])

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    router.replace('/login')
  }

  if (loading)
    return (
      <div className='auth-page'>
        <div className='card auth-card'>
          <p className='muted'>กำลังตรวจสอบ session…</p>
        </div>
      </div>
    )
  if (error)
    return (
      <div className='auth-page'>
        <div className='card auth-card'>
          <div className='error'>{error}</div>
        </div>
      </div>
    )
  if (!user) return null

  const isAdmin = pathname.startsWith('/admin')
  return (
    <div className='shell'>
      <aside className='sidebar'>
        <Link className='brand' href='/projects'>
          Project Forge<span className='brand-subtitle'>private workspace</span>
        </Link>
        <nav className='nav' aria-label='Main navigation'>
          <Link
            href='/projects'
            aria-current={
              pathname.startsWith('/projects') || pathname === '/'
                ? 'page'
                : undefined
            }
          >
            Projects
          </Link>
          {isAdmin ? (
            <>
              <Link
                href='/admin'
                aria-current={pathname === '/admin' ? 'page' : undefined}
              >
                Admin overview
              </Link>
              <Link
                href='/admin/users'
                aria-current={
                  pathname.startsWith('/admin/users') ? 'page' : undefined
                }
              >
                Users
              </Link>
              <Link
                href='/admin/access-requests'
                aria-current={
                  pathname.startsWith('/admin/access-requests')
                    ? 'page'
                    : undefined
                }
              >
                Access requests
              </Link>
            </>
          ) : null}
          {user.role === 'ADMIN' && !isAdmin ? (
            <Link href='/admin'>Admin</Link>
          ) : null}
          <button type='button' onClick={logout}>
            Sign out
          </button>
        </nav>
        <div className='account-card'>
          <strong>{user.name || user.githubLogin}</strong>
          <span className='muted'>
            @{user.githubLogin}
            {user.role === 'ADMIN' ? ' · admin' : ''}
          </span>
        </div>
      </aside>
      <main className='main'>
        <header className='topbar'>
          <div>
            <span className='eyebrow'>
              {isAdmin ? 'Administration' : 'Workspace'}
            </span>
            <h1>{isAdmin ? 'System management' : 'Projects'}</h1>
          </div>
          <span className='badge good'>Private · Phase 1</span>
        </header>
        {children}
      </main>
    </div>
  )
}
