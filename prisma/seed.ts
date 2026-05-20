import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'
import path from 'path'

const url = process.env.DATABASE_URL ?? `file:${path.resolve(process.cwd(), 'prisma/dev.db')}`
const adapter = new PrismaLibSql({ url })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminHash = await bcrypt.hash('admin1234', 10)
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminHash },
  })

  const equipmentData = [
    { name: 'Sony FX3 시네마 카메라', category: '카메라', totalQuantity: 3, description: '풀프레임 시네마 카메라' },
    { name: 'Sony A7IV 미러리스', category: '카메라', totalQuantity: 5, description: '4K 미러리스 카메라' },
    { name: 'DJI RS3 짐벌', category: '카메라', totalQuantity: 4, description: '3축 카메라 짐벌' },
    { name: 'Aputure 120D 조명', category: '조명', totalQuantity: 6, description: '120W LED 조명' },
    { name: 'Godox SL200II 조명', category: '조명', totalQuantity: 4, description: '200W 스튜디오 조명' },
    { name: '소프트박스 세트', category: '조명', totalQuantity: 8, description: '60x90cm 소프트박스' },
    { name: 'Rode NTG5 샷건 마이크', category: '음향', totalQuantity: 4, description: '방송용 샷건 마이크' },
    { name: 'Zoom H6 레코더', category: '음향', totalQuantity: 3, description: '6채널 휴대용 레코더' },
    { name: '삼발이(트라이포드)', category: '기타', totalQuantity: 10, description: '카메라 삼발이 75mm' },
    { name: 'ND 필터 세트', category: '기타', totalQuantity: 6, description: 'ND4/8/16/32 세트' },
  ]

  const existingCount = await prisma.equipment.count()
  if (existingCount === 0) {
    await prisma.equipment.createMany({ data: equipmentData })
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
