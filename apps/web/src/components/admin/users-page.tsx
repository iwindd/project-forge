'use client'

import {
  ApiError,
  getUsers,
  revokeUserSessions,
  updateUserRole,
  updateUserStatus,
  type User
} from '@/lib/api'
import { useEffect, useState } from 'react'

const statuses: User['accessStatus'][] = ['APPROVED', 'REJECTED', 'SUSPENDED']

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    setLoading(true)
    try {
      setUsers((await getUsers(search, status)).data)
      setError('')
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError ? cause.message : 'โหลด users ไม่สำเร็จ'
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [status])

  async function changeStatus(user: User, next: User['accessStatus']) {
    if (
      next === user.accessStatus ||
      !window.confirm(`เปลี่ยนสถานะ ${user.githubLogin} เป็น ${next} หรือไม่?`)
    )
      return
    setBusy(user.id)
    try {
      await updateUserStatus(user.id, next)
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setBusy('')
    }
  }

  async function changeRole(user: User, next: User['role']) {
    if (
      next === user.role ||
      !window.confirm(
        `เปลี่ยน role ของ ${user.githubLogin} เป็น ${next} หรือไม่?`
      )
    )
      return
    setBusy(user.id)
    try {
      await updateUserRole(user.id, next)
      await load()
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'เปลี่ยน role ไม่สำเร็จ'
      )
    } finally {
      setBusy('')
    }
  }

  async function revoke(user: User) {
    if (!window.confirm(`Revoke ทุก session ของ ${user.githubLogin} หรือไม่?`))
      return
    setBusy(user.id)
    try {
      await revokeUserSessions(user.id)
      setError('Revoked sessions แล้ว')
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'Revoke sessions ไม่สำเร็จ'
      )
    } finally {
      setBusy('')
    }
  }

  return (
    <div className='content'>
      <div className='page-heading'>
        <div>
          <span className='eyebrow'>Access control</span>
          <h2>Users</h2>
          <p className='muted'>
            ค้นหาและจัดการ access status กับ role ของผู้ใช้
          </p>
        </div>
      </div>
      <div className='toolbar'>
        <div className='filters'>
          <input
            aria-label='Search users'
            value={search}
            onChange={event => setSearch(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void load()
            }}
            placeholder='Search GitHub login'
          />
          <select
            aria-label='Filter status'
            value={status}
            onChange={event => setStatus(event.target.value)}
          >
            <option value=''>All statuses</option>
            {statuses.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            className='button secondary'
            type='button'
            onClick={() => void load()}
          >
            Search
          </button>
        </div>
        <span className='muted'>{users.length} users shown</span>
      </div>
      {error ? <div className='error spacing-top'>{error}</div> : null}
      {loading ? (
        <div className='card'>
          <p className='muted'>กำลังโหลด users…</p>
        </div>
      ) : (
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Access</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Security</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name || user.githubLogin}</strong>
                    <br />
                    <span className='muted'>@{user.githubLogin}</span>
                  </td>
                  <td>
                    <select
                      disabled={busy === user.id}
                      value={user.accessStatus}
                      onChange={event =>
                        void changeStatus(
                          user,
                          event.target.value as User['accessStatus']
                        )
                      }
                    >
                      <option value='PENDING'>PENDING</option>
                      <option value='APPROVED'>APPROVED</option>
                      <option value='REJECTED'>REJECTED</option>
                      <option value='SUSPENDED'>SUSPENDED</option>
                    </select>
                  </td>
                  <td>
                    <select
                      disabled={busy === user.id}
                      value={user.role}
                      onChange={event =>
                        void changeRole(
                          user,
                          event.target.value as User['role']
                        )
                      }
                    >
                      <option value='USER'>USER</option>
                      <option value='ADMIN'>ADMIN</option>
                    </select>
                  </td>
                  <td className='muted'>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('th-TH')
                      : '—'}
                  </td>
                  <td>
                    <button
                      className='button secondary'
                      disabled={busy === user.id}
                      type='button'
                      onClick={() => void revoke(user)}
                    >
                      Revoke sessions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
