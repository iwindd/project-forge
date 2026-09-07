'use client'

import { ApiError, getMe, requestAccess, type User } from '@/lib/api'
import { useEffect, useState } from 'react'

export function AccessPendingCard() {
  const [user, setUser] = useState<User | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    getMe()
      .then(({ user: current }) => setUser(current))
      .catch((cause: unknown) =>
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ'
        )
      )
  }, [])
  async function submit() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await requestAccess(reason)
      setMessage('ส่งคำขอให้ admin แล้ว')
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'ส่งคำขอไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className='auth-page'>
      <div className='card auth-card'>
        <span className='eyebrow'>Access review</span>
        <h1>รอการอนุมัติ</h1>
        <p className='muted'>
          บัญชี @{user?.githubLogin || '…'} ถูกสร้างแล้ว
          แต่ยังไม่มีสิทธิ์เข้าใช้งาน Project Forge
        </p>
        {message ? <div className='notice spacing-top'>{message}</div> : null}
        {error ? <div className='error spacing-top'>{error}</div> : null}
        <div className='field spacing-top'>
          <label htmlFor='access-reason'>เหตุผลเพิ่มเติม (optional)</label>
          <textarea
            id='access-reason'
            rows={4}
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder='บอก admin สั้น ๆ ว่าต้องการใช้งานเพื่ออะไร'
          />
        </div>
        <button
          className='button spacing-top'
          disabled={saving}
          type='button'
          onClick={() => void submit()}
        >
          {saving ? 'Sending…' : 'Request access'}
        </button>
        <a className='text-link spacing-top' href='/login'>
          Back to login
        </a>
      </div>
    </div>
  )
}
