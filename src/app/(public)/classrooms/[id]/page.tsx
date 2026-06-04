// src/app/(public)/classrooms/[id]/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClassroomDetailClient } from '@/components/classroom/ClassroomDetailClient'

export const dynamic = 'force-dynamic'

export default async function ClassroomDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const classroom = await prisma.classroom.findUnique({
    where: { id, status: 'active' },
  })

  if (!classroom) notFound()

  return <ClassroomDetailClient classroom={classroom} />
}
