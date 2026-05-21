'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'

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
    <>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ffb2ba]/15 border border-[#ffb2ba]/25 mb-3">
          <Camera className="w-5 h-5 text-[#ffb2ba]" />
        </div>
        <h1 className="text-xl font-bold text-[#e5e2e1]">관리자 로그인</h1>
        <p className="text-sm text-[#9b8f91] mt-1">영상콘텐츠과 기자재 관리 시스템</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-xs font-medium text-[#9b8f91]">아이디</label>
          <input
            id="username"
            name="username"
            required
            autoComplete="username"
            className="w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] focus:outline-none focus:border-[#7d7173] transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-[#9b8f91]">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] focus:outline-none focus:border-[#7d7173] transition-colors"
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />로그인 중...</> : '로그인'}
        </button>
      </form>
    </>
  )
}
