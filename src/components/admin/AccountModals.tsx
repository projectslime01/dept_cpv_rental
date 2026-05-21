'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  createAdminAccount,
  deleteAdminAccount,
  changeAdminPassword,
} from '@/app/actions/admin-accounts'
import { Users, Plus, Trash2, KeyRound, X, CheckCircle2, Shield } from 'lucide-react'

type AdminRow = { id: number; username: string; createdAt: Date }
type ModalType = 'create' | 'delete' | 'changePassword' | null

interface Props {
  admins: AdminRow[]
  currentAdminId: number
}

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#7d7173] transition-colors'

export function AccountManagement({ admins, currentAdminId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalType>(null)
  const [targetAdmin, setTargetAdmin] = useState<AdminRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function closeModal() {
    if (isPending) return
    setModal(null)
    setTargetAdmin(null)
    setError(null)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openDelete(admin: AdminRow) {
    setTargetAdmin(admin)
    setError(null)
    setModal('delete')
  }

  function openChangePassword() {
    setError(null)
    setModal('changePassword')
  }

  // ── 생성 ────────────────────────────────────────────────────────────────────
  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const pw = fd.get('password') as string
    const confirm = fd.get('confirmPassword') as string
    if (pw !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }

    startTransition(async () => {
      const res = await createAdminAccount(fd)
      if (res.success) {
        closeModal()
        showToast('계정이 생성됐습니다.')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  // ── 삭제 ────────────────────────────────────────────────────────────────────
  function handleDelete() {
    if (!targetAdmin) return
    startTransition(async () => {
      const res = await deleteAdminAccount(targetAdmin.id)
      if (res.success) {
        closeModal()
        showToast('계정이 삭제됐습니다.')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  // ── 비밀번호 변경 ────────────────────────────────────────────────────────────
  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const np = fd.get('newPassword') as string
    const confirm = fd.get('confirmPassword') as string
    if (np !== confirm) { setError('새 비밀번호가 일치하지 않습니다.'); return }

    startTransition(async () => {
      const res = await changeAdminPassword(fd)
      if (res.success) {
        closeModal()
        showToast('비밀번호가 변경됐습니다.')
      } else {
        setError(res.error)
      }
    })
  }

  const fmt = (d: Date) => format(new Date(d), 'yy.MM.dd', { locale: ko })

  return (
    <>
      {/* 성공 토스트 */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-950 border border-emerald-800 text-emerald-300 text-sm font-semibold px-4 py-3 rounded-xl shadow-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* 계정 목록 카드 */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <Users className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">관리자 계정</h2>
          <span className="ml-auto text-xs text-[#6b6468]">{admins.length}명</span>
          <button
            onClick={() => { setError(null); setModal('create') }}
            className="ml-3 flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            계정 추가
          </button>
        </div>

        <div className="divide-y divide-[#252228]">
          {admins.map(admin => {
            const isSelf = admin.id === currentAdminId
            return (
              <div key={admin.id} className="flex items-center gap-3 px-5 py-3.5">
                {/* 아이콘 */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelf ? 'bg-[#ffb2ba]/15' : 'bg-[#252228]'}`}>
                  <Shield className={`w-4 h-4 ${isSelf ? 'text-[#ffb2ba]' : 'text-[#6b6468]'}`} />
                </div>

                {/* 아이디 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#e5e2e1]">{admin.username}</span>
                    {isSelf && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ffb2ba]/15 text-[#ffb2ba] border border-[#ffb2ba]/25">
                        나
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b6468] mt-0.5">생성일 {fmt(admin.createdAt)}</p>
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-2 shrink-0">
                  {isSelf && (
                    <button
                      onClick={openChangePassword}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[#3a3640] text-xs font-medium text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      비번 변경
                    </button>
                  )}
                  {!isSelf && (
                    <button
                      onClick={() => openDelete(admin)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[#3a3640] text-xs font-medium text-[#6b6468] hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 모달 오버레이 ─────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />

          {/* ── 계정 생성 모달 ─────────────────────────────────────────────── */}
          {modal === 'create' && (
            <div className="relative bg-[#201f21] rounded-2xl border border-[#2e2b2f] w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#252228]">
                <h3 className="text-base font-bold text-[#e5e2e1]">새 관리자 계정 추가</h3>
                <button onClick={closeModal} className="text-[#6b6468] hover:text-[#e5e2e1] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9b8f91]">아이디 *</label>
                  <input
                    name="username"
                    required
                    autoComplete="off"
                    placeholder="영문 소문자, 숫자, _ (3~20자)"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9b8f91]">비밀번호 * <span className="text-[#4a4448]">(6~20자리)</span></label>
                  <input name="password" type="password" required minLength={6} maxLength={20} autoComplete="new-password" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9b8f91]">비밀번호 확인 *</label>
                  <input name="confirmPassword" type="password" required autoComplete="new-password" className={inputCls} />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={closeModal} disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors disabled:opacity-40">
                    취소
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? '생성 중...' : '계정 생성'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── 삭제 확인 모달 ─────────────────────────────────────────────── */}
          {modal === 'delete' && targetAdmin && (
            <div className="relative bg-[#201f21] rounded-2xl border border-[#2e2b2f] w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#252228]">
                <h3 className="text-base font-bold text-[#e5e2e1]">계정 삭제</h3>
                <button onClick={closeModal} className="text-[#6b6468] hover:text-[#e5e2e1] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#9b8f91]">
                  <span className="font-bold text-[#e5e2e1]">{targetAdmin.username}</span> 계정을 삭제합니다.
                  <br />이 작업은 되돌릴 수 없습니다.
                </p>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors disabled:opacity-40">
                    취소
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? '삭제 중...' : '삭제 확인'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 비밀번호 변경 모달 ─────────────────────────────────────────── */}
          {modal === 'changePassword' && (
            <div className="relative bg-[#201f21] rounded-2xl border border-[#2e2b2f] w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#252228]">
                <h3 className="text-base font-bold text-[#e5e2e1]">비밀번호 변경</h3>
                <button onClick={closeModal} className="text-[#6b6468] hover:text-[#e5e2e1] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9b8f91]">현재 비밀번호 *</label>
                  <input name="currentPassword" type="password" required autoComplete="current-password" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9b8f91]">새 비밀번호 * <span className="text-[#4a4448]">(6~20자리)</span></label>
                  <input name="newPassword" type="password" required minLength={6} maxLength={20} autoComplete="new-password" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9b8f91]">새 비밀번호 확인 *</label>
                  <input name="confirmPassword" type="password" required autoComplete="new-password" className={inputCls} />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={closeModal} disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors disabled:opacity-40">
                    취소
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  )
}
