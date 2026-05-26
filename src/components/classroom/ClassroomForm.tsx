'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClassroomRequest, addWeekdays } from '@/app/actions/classroom'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import {
  User, Users, CalendarDays, FileText, Monitor,
  CheckCircle2, ArrowRight, AlertCircle,
} from 'lucide-react'

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#7d7173] transition-colors'

function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-[#9b8f91]">{label}</div>
      {hint && <div className="text-[11px] text-[#6b6468] leading-relaxed">{hint}</div>}
      {children}
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f]">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228] rounded-t-2xl">
        <Icon className="w-4 h-4 text-[#6b6468]" />
        <h2 className="text-sm font-semibold text-[#c8c4c3]">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function ClassroomForm() {
  const [isPending, startTransition] = useTransition()
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [isGroup, setIsGroup] = useState<boolean | null>(null)
  const [monitorUsed, setMonitorUsed] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)

  // 평일 2일 후 = 최소 대여 시작 가능일
  const minStartDate = useMemo(() => {
    const min = addWeekdays(new Date(), 2)
    min.setHours(0, 0, 0, 0)
    return min
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isGroup === null) { setError('개인 또는 조별 사용 여부를 선택해주세요.'); return }
    if (monitorUsed === null) { setError('모니터 사용 여부를 선택해주세요.'); return }
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('startAt', startAt)
    fd.set('endAt', endAt)
    fd.set('isGroup', String(isGroup))
    if (!monitorUsed) fd.set('monitorAssets', '미사용')
    startTransition(async () => {
      const res = await createClassroomRequest(fd)
      if (res.success) setRequestNumber(res.requestNumber)
      else setError(res.error)
    })
  }

  // ── 완료 화면 ────────────────────────────────────────────────────────────────
  if (requestNumber) {
    return (
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-8 text-center space-y-5 max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950/50 border border-emerald-900/50">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e5e2e1]">신청 완료!</h2>
          <p className="text-sm text-[#9b8f91] mt-1">강의실 대여 신청이 접수됐습니다.</p>
        </div>
        <div className="bg-[#1a191b] rounded-xl border border-[#2e2b2f] p-4">
          <p className="text-[11px] font-bold text-[#6b6468] uppercase tracking-wider mb-2">신청 번호</p>
          <p className="font-mono text-lg font-black text-[#ffb2ba]">{requestNumber}</p>
        </div>
        <p className="text-xs text-red-400 font-medium bg-red-950/40 rounded-xl px-4 py-2.5 border border-red-900/50">
          ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/classroom" className="h-10 px-5 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors flex items-center">
            처음으로
          </a>
          <a href="/status" className="h-10 px-5 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-semibold transition-colors flex items-center gap-1.5">
            신청 조회 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">

      {/* ① 대여자 정보 */}
      <SectionCard icon={User} title="대여자 (대표자) 정보">
        <p className="text-[11px] text-[#6b6468] bg-[#1a191b] rounded-xl px-3 py-2 border border-[#252228]">
          예) 진은범 / 2022102048 / 010-2957-5554
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="이름 *">
            <input name="applicantName" required placeholder="홍길동" className={inputCls} />
          </Field>
          <Field label="학번 *">
            <input name="studentId" required placeholder="2022102048" className={inputCls} />
          </Field>
          <Field label="전화번호 *">
            <input name="phone" type="tel" required placeholder="010-0000-0000" className={inputCls} />
          </Field>
        </div>
      </SectionCard>

      {/* ② 조별/개인 */}
      <SectionCard icon={Users} title="조별 / 개인 사용">
        <div className="text-[11px] text-[#6b6468] bg-[#1a191b] rounded-xl px-3 py-2.5 border border-[#252228] leading-relaxed">
          조별과제 사용의 경우 총원 및 조원 이름을 작성해주세요.<br />
          <span className="text-amber-400 font-semibold">꼭! 조원이 한 명도 빠짐없이 다 들어가야 합니다.</span>
          <br />예) 5명 / 홍길동, 김철수, 이영희 …
        </div>

        {/* 토글 */}
        <div className="flex gap-2">
          {[
            { value: false, label: '개인 사용' },
            { value: true,  label: '조별 과제' },
          ].map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setIsGroup(value)}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                isGroup === value
                  ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/40'
                  : 'bg-[#1a191b] text-[#6b6468] border-[#3a3640] hover:text-[#9b8f91] hover:border-[#7d7173]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 조별 선택 시 상세 입력 */}
        {isGroup === true && (
          <div className="space-y-3 pt-1">
            <Field label="총원 *">
              <input
                name="groupCount"
                type="number"
                min={2}
                required={isGroup}
                placeholder="예) 5"
                className={inputCls}
              />
            </Field>
            <Field label="조원 이름 *">
              <textarea
                name="groupMembers"
                required={isGroup}
                rows={2}
                placeholder="예) 홍길동, 김철수, 이영희, 박민준, 최지아"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#7d7173] transition-colors resize-none"
              />
            </Field>
          </div>
        )}
        {isGroup === false && (
          <p className="text-xs text-[#6b6468] pl-1">개인 사용 — 조원 정보 입력 없이 진행합니다.</p>
        )}
      </SectionCard>

      {/* ③ 대여 및 반납 일자 */}
      <SectionCard icon={CalendarDays} title="대여 및 반납 일자">
        <div className="flex items-start gap-2 text-[11px] text-amber-400 bg-amber-950/30 border border-amber-900/40 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>사용일 기준 <strong>최소 평일 2일 전</strong> 신청 (주말 제외)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="대여 시작 *">
            <DateTimePicker value={startAt} onChange={setStartAt} placeholder="대여 시작" minDate={minStartDate} />
          </Field>
          <Field label="반납 예정 *">
            <DateTimePicker value={endAt} onChange={setEndAt} placeholder="반납 예정" minDate={minStartDate} />
          </Field>
        </div>
      </SectionCard>

      {/* ④ 대여 목적 */}
      <SectionCard icon={FileText} title="강의실 대여 목적">
        <Field label="목적 *">
          <textarea
            name="purpose"
            required
            rows={3}
            placeholder="예) 팀 프로젝트 촬영 준비, 편집 작업 등"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#7d7173] transition-colors resize-none"
          />
        </Field>
      </SectionCard>

      {/* ⑤ 모니터 자산번호 */}
      <SectionCard icon={Monitor} title="모니터 자산번호">
        <div className="text-[11px] text-[#6b6468] bg-[#1a191b] rounded-xl px-3 py-2.5 border border-[#252228] leading-relaxed space-y-0.5">
          <p>• 모니터 뒤 <span className="text-amber-400 font-semibold">노란 스티커</span>의 자산번호를 확인하세요.</p>
          <p>• 사용하는 모니터 수만큼 번호를 기재하세요.</p>
          <p>• 미사용 시 아래에서 <span className="font-semibold text-[#9b8f91]">미사용</span>을 선택하세요.</p>
        </div>

        <div className="flex gap-2">
          {[
            { value: false, label: '미사용' },
            { value: true,  label: '사용' },
          ].map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setMonitorUsed(value)}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                monitorUsed === value
                  ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/40'
                  : 'bg-[#1a191b] text-[#6b6468] border-[#3a3640] hover:text-[#9b8f91] hover:border-[#7d7173]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {monitorUsed === true && (
          <Field label="자산번호 *" hint="여러 대면 줄 바꿈 또는 쉼표로 구분">
            <textarea
              name="monitorAssets"
              required={monitorUsed}
              rows={2}
              placeholder="예) AB-12345, AB-12346"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#7d7173] transition-colors resize-none"
            />
          </Field>
        )}
        {monitorUsed === false && (
          <p className="text-xs text-[#6b6468] pl-1">모니터 미사용으로 기록됩니다.</p>
        )}
      </SectionCard>

      {/* ⑥ 조회용 비밀번호 */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-5 space-y-1.5">
        <label htmlFor="password" className="block text-xs font-semibold text-[#9b8f91]">
          조회용 비밀번호 * <span className="text-[#4a4448] font-normal">(4~8자리)</span>
        </label>
        <input id="password" name="password" type="password" minLength={4} maxLength={8} required className={inputCls} />
        <p className="text-[11px] text-[#6b6468]">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !startAt || !endAt || isGroup === null || monitorUsed === null}
        className="w-full h-12 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? '신청 중...' : <>강의실 대여 신청 <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}
