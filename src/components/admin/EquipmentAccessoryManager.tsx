'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createEquipmentAccessory, deleteEquipmentAccessory, CreatedAccessoryEntry } from '@/app/actions/admin'
import { Trash2, Plus, Package, Link2 } from 'lucide-react'

interface Props {
  equipmentId: number
  initialEntries: CreatedAccessoryEntry[]
}

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors'

export function EquipmentAccessoryManager({ equipmentId, initialEntries }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [entries, setEntries] = useState<CreatedAccessoryEntry[]>(initialEntries)
  const [addPending, startAddTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  function handleAdd(formData: FormData) {
    setError(null)
    setSuccessMsg(null)
    formData.set('equipmentId', String(equipmentId))
    startAddTransition(async () => {
      const result = await createEquipmentAccessory(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setEntries((prev) => [...prev, result.entry])
        setSuccessMsg('부속 기자재가 추가되었습니다.')
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  function handleDeleteConfirm(id: number) {
    startDeleteTransition(async () => {
      try {
        await deleteEquipmentAccessory(id)
        setEntries((prev) => prev.filter((e) => e.id !== id))
        setConfirmDeleteId(null)
        router.refresh()
      } catch {
        setError('대여 기록이 있는 부속은 삭제할 수 없습니다.')
        setConfirmDeleteId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 등록된 부속 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="px-5 py-4 border-b border-base">
          <h2 className="text-sm font-bold text-base-primary">등록된 부속 기자재</h2>
        </div>
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-base-muted">
            등록된 부속 기자재가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-base bg-surface-raised">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">이름</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider hidden sm:table-cell">설명</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">공유 재고</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-base-secondary uppercase tracking-wider">총 수량</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-base-secondary uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-raised transition-colors">
                    <td className="px-5 py-3.5 font-medium text-base-primary">{entry.name}</td>
                    <td className="px-5 py-3.5 text-base-secondary hidden sm:table-cell">
                      {entry.description ?? <span className="text-base-muted">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {entry.sharedStockKey ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                          <Link2 className="w-3 h-3" />
                          {entry.sharedStockKey}
                        </span>
                      ) : (
                        <span className="text-base-muted text-xs">단독</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-base-primary">{entry.totalQuantity}개</td>
                    <td className="px-5 py-3.5 text-right">
                      {confirmDeleteId === entry.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-red-600 dark:text-red-400">삭제할까요?</span>
                          <button
                            onClick={() => handleDeleteConfirm(entry.id)}
                            disabled={deletePending}
                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-semibold text-base-secondary hover:underline"
                          >
                            취소
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          disabled={deletePending}
                          className="inline-flex items-center gap-1 text-xs text-base-muted hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 오류/성공 메시지 */}
      {error && (
        <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3">
          {successMsg}
        </div>
      )}

      {/* 새 부속 추가 폼 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5">
        <h2 className="text-sm font-bold text-base-primary mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          새 부속 기자재 추가
        </h2>
        <form ref={formRef} action={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">이름 *</label>
              <input
                name="name"
                required
                placeholder="예: 배터리 팩"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">설명 (선택)</label>
              <input
                name="description"
                placeholder="예: 소니 NP-F970"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">총 수량 *</label>
              <input
                name="totalQuantity"
                type="number"
                min="1"
                required
                placeholder="예: 5"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" />
                공유 재고 그룹 (선택)
              </label>
              <input
                name="sharedStockKey"
                placeholder="예: fx3-a7m4-배터리"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-base-muted bg-surface-raised rounded-xl px-3.5 py-2.5 border border-base">
            <Link2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-500" />
            <p className="leading-relaxed">
              여러 기자재가 <strong className="text-base-secondary">물리적으로 같은 부속</strong>(예: FX3·A7M4가 함께 쓰는 배터리)을
              공유한다면, 각 기자재의 부속에 <strong className="text-base-secondary">동일한 공유 재고 그룹</strong> 값을 입력하세요.
              같은 그룹의 부속은 하나의 재고 풀을 공유해, 한쪽에서 대여하면 다른 쪽 가용 수량도 함께 줄어듭니다.
              (그룹에 합류하면 총 수량이 그룹 전체에 동기화됩니다.)
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addPending}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              {addPending ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
