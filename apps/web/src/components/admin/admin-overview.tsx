'use client'

import { ApiError, getAccessRequests, getUsers } from '@/lib/api'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function AdminOverview() {
  const [summary, setSummary] = useState({ users: 0, pending: 0 })
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([getUsers(), getAccessRequests()])
      .then(([users, access]) =>
        setSummary({
          users: users.total,
          pending: access.requests.filter(item => item.status === 'PENDING')
            .length
        })
      )
      .catch((cause: unknown) =>
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'โหลดข้อมูล admin ไม่สำเร็จ'
        )
      )
  }, [])
  return (
    <div className='content'>
      <div className='page-heading'>
        <div>
          <span className='eyebrow'>Administration</span>
          <h2>Overview</h2>
          <p className='muted'>จัดการผู้ใช้และคำขอเข้าใช้งานของระบบภายใน</p>
        </div>
      </div>
      {error ? <div className='error spacing-top'>{error}</div> : null}
      <div className='stat-grid spacing-top'>
        <div className='card stat'>
          <span className='muted'>Users</span>
          <strong>{summary.users}</strong>
          <Link href='/admin/users'>View users</Link>
        </div>
        <div className='card stat'>
          <span className='muted'>Pending access requests</span>
          <strong>{summary.pending}</strong>
          <Link href='/admin/access-requests'>Review requests</Link>
        </div>
      </div>
      <div className='card spacing-top'>
        <h3>Phase 1 policy</h3>
        <p className='muted'>
          Admin actions ถูกตรวจซ้ำที่ NestJS API และบันทึก audit ทุก mutation
          ระบบยังไม่มี Hermes, Chat, Sandbox, Issues หรือ Pull Requests ใน phase
          นี้
        </p>
      </div>
    </div>
  )
}
