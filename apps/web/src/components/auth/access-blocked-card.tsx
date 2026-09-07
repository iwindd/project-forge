'use client'

import { getMe, type User } from '@/lib/api'
import { useEffect, useState } from 'react'

export function AccessBlockedCard() {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    getMe()
      .then(({ user: current }) => setUser(current))
      .catch(() => undefined)
  }, [])
  return (
    <div className='auth-page'>
      <div className='card auth-card'>
        <span className='eyebrow'>Access blocked</span>
        <h1>ยังเข้าใช้งานไม่ได้</h1>
        <p className='muted'>
          บัญชี @{user?.githubLogin || 'นี้'} มีสถานะ{' '}
          {user?.accessStatus || 'REJECTED'} กรุณาติดต่อ admin
          หากคิดว่าเป็นความผิดพลาด
        </p>
        <a className='text-link spacing-top' href='/login'>
          กลับหน้า login
        </a>
      </div>
    </div>
  )
}
