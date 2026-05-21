'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    } else {
      window.location.href = '/admin/dashboard'
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="username">아이디</Label>
          <Input id="username" name="username" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>
    </div>
  )
}
