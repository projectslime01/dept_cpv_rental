import { ClassroomForm } from '@/components/classroom/ClassroomForm'
import { DoorOpen } from 'lucide-react'

export default function ClassroomPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-[#ffb2ba]/10 border border-[#ffb2ba]/20">
          <DoorOpen className="w-5 h-5 text-[#ffb2ba]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#e5e2e1]">강의실 대여 신청</h1>
          <p className="text-xs text-[#6b6468] mt-0.5">영상콘텐츠과 강의실 · 편집실 대여</p>
        </div>
      </div>

      <ClassroomForm />
    </div>
  )
}
