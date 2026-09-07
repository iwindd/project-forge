'use client'

import { githubLoginUrl } from '@/lib/api'
import { useEffect, useState } from 'react'

export function LoginCard() {
  const [error, setError] = useState('')
  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get('error')
    if (message) setError(message)
  }, [])
  return (
    <div className='auth-page'>
      <div className='card auth-card'>
        <span className='eyebrow'>Private developer workspace</span>
        <h1>Project Forge</h1>
        <p className='muted'>
          ระบบภายในสำหรับจัดการ project ของทีม โดย Phase 1 เปิดให้เข้าใช้งานผ่าน
          GitHub เท่านั้น
        </p>
        {error ? (
          <div className='error spacing-top'>เข้าสู่ระบบไม่สำเร็จ: {error}</div>
        ) : null}
        <a className='button github-button spacing-top' href={githubLoginUrl()}>
          Continue with GitHub
        </a>
        <p className='muted small spacing-top'>
          ผู้ใช้ใหม่จะเข้าได้หลัง admin อนุมัติ access request
        </p>
      </div>
    </div>
  )
}
