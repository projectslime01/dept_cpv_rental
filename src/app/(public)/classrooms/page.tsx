// src/app/(public)/classrooms/page.tsx
import { prisma } from '@/lib/prisma'
import { Building2, Users, Monitor, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getClassroomList() {
  const classrooms = await prisma.classroom.findMany({
    where: { status: 'active' },
    orderBy: { roomNumber: 'asc' },
  })
  return classrooms
}

export default async function ClassroomsPage() {
  const classrooms = await getClassroomList()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-base-primary tracking-tight">강의실 대여 목록</h1>
        <p className="text-sm text-base-muted mt-1">
          학과 행사, 촬영 실습, 스터디 등을 위해 대여 가능한 강의실 공간 리스트입니다.
        </p>
      </div>

      {/* Classroom list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classrooms.length === 0 ? (
          <div className="col-span-full bg-surface-base rounded-2xl border border-base p-8 text-center">
            <Building2 className="w-12 h-12 text-base-faint mx-auto mb-3" />
            <p className="text-sm text-base-muted">대여 가능한 강의실이 등록되어 있지 않습니다.</p>
          </div>
        ) : (
          classrooms.map((room) => {
            const equipmentList = room.equipment ? room.equipment.split(',').map(e => e.trim()) : []
            return (
              <div
                key={room.id}
                className="bg-surface-base rounded-2xl border border-base hover:border-brand-indigo/50 transition-all duration-300 overflow-hidden group flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-brand-indigo shrink-0" />
                        <h3 className="text-lg font-bold text-base-primary group-hover:text-brand-indigo transition-colors">
                          {room.roomNumber}
                        </h3>
                      </div>
                      {room.description && (
                        <p className="text-xs text-base-muted font-normal leading-relaxed">
                          {room.description}
                        </p>
                      )}
                    </div>
                    {/* Capacity Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-indigo-muted border border-brand-indigo text-brand-indigo text-xs font-semibold shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span>{room.capacity}명</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-surface-overlay" />

                  {/* Equipment list */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-base-secondary">
                      <Monitor className="w-3.5 h-3.5 text-base-muted" />
                      <span>기본 제공 시설 및 기자재</span>
                    </div>
                    {equipmentList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {equipmentList.map((eq, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-surface-overlay border border-base text-[10px] font-medium text-base-secondary"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-base-faint">제공되는 별도 장비 없음</p>
                    )}
                  </div>
                </div>

                {/* Apply Button Section */}
                <div className="px-5 pb-5 pt-1">
                  <a
                    href={`/classrooms/${room.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-overlay hover:bg-brand-indigo text-sm font-semibold text-base-primary hover:text-white border border-base hover:border-transparent transition-all duration-200"
                  >
                    <span>예약 현황 확인 및 대여 신청</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
