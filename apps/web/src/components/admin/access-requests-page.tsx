'use client'

import {
  ApiError,
  decideAccess,
  getAccessRequests,
  type AccessRequest
} from '@/lib/api'
import { useEffect, useState } from 'react'

export function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  async function load() {
    setLoading(true)
    try {
      setRequests((await getAccessRequests()).requests)
      setError('')
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'โหลด access requests ไม่สำเร็จ'
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  async function decide(
    request: AccessRequest,
    decision: 'approve' | 'reject'
  ) {
    if (
      !window.confirm(
        `${decision === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} access ของ ${request.user?.githubLogin || request.userId} หรือไม่?`
      )
    )
      return
    setBusy(request.id)
    try {
      await decideAccess(request.id, decision)
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'บันทึกผลไม่สำเร็จ')
    } finally {
      setBusy('')
    }
  }
  return (
    <div className='content'>
      <div className='page-heading'>
        <div>
          <span className='eyebrow'>Admission queue</span>
          <h2>Access requests</h2>
          <p className='muted'>ตรวจคำขอเข้าใช้งานก่อนให้ผู้ใช้เข้าระบบ</p>
        </div>
      </div>
      {error ? <div className='error spacing-top'>{error}</div> : null}
      {loading ? (
        <div className='card spacing-top'>
          <p className='muted'>กำลังโหลดคำขอ…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className='card empty spacing-top'>
          <h3>ไม่มี access request</h3>
          <p className='muted'>คำขอใหม่จาก GitHub login จะแสดงที่นี่</p>
        </div>
      ) : (
        <div className='request-list spacing-top'>
          {requests.map(request => (
            <article className='card request-card' key={request.id}>
              <div>
                <span
                  className={`badge ${request.status === 'PENDING' ? 'warn' : request.status === 'APPROVED' ? 'good' : 'bad'}`}
                >
                  {request.status}
                </span>
                <h3>
                  {request.user?.name ||
                    request.user?.githubLogin ||
                    request.userId}
                </h3>
                <p className='muted'>
                  @{request.user?.githubLogin || 'unknown'} ·{' '}
                  {new Date(request.createdAt).toLocaleString('th-TH')}
                </p>
                {request.reason ? (
                  <p>{request.reason}</p>
                ) : (
                  <p className='muted'>ไม่ได้ระบุเหตุผล</p>
                )}
              </div>
              {request.status === 'PENDING' ? (
                <div className='actions'>
                  <button
                    className='button'
                    disabled={busy === request.id}
                    type='button'
                    onClick={() => void decide(request, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className='button danger'
                    disabled={busy === request.id}
                    type='button'
                    onClick={() => void decide(request, 'reject')}
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className='muted'>
                  Reviewed{' '}
                  {request.reviewedAt
                    ? new Date(request.reviewedAt).toLocaleString('th-TH')
                    : ''}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
