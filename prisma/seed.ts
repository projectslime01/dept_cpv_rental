import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/db'
let prisma: PrismaClient
if (connectionString.startsWith('file:')) {
  const dbPath = connectionString.replace('file:', '')
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  prisma = new PrismaClient({ adapter, log: ['error'] })
} else {
  const adapter = new PrismaNeon({ connectionString })
  prisma = new PrismaClient({ adapter, log: ['error'] })
}

async function main() {
  const adminHash = await bcrypt.hash('admin1234', 10)
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminHash, name: '최고관리자' },
  })

  const equipmentData = [
    // 카메라 바디
    { name: '소니 FX3', category: '카메라 바디', totalQuantity: 10, description: '풀프레임 시네마 카메라' },
    { name: '소니 A7M4', category: '카메라 바디', totalQuantity: 10, description: '풀프레임 미러리스 카메라' },
    { name: '소니 Z90', category: '카메라 바디', totalQuantity: 9, description: '4K HDR 핸디캠' },

    // 렌즈
    { name: '소니 24-70mm', category: '렌즈', totalQuantity: 6, description: 'SEL2470GM 표준 줌 렌즈' },
    { name: '소니 16-35mm', category: '렌즈', totalQuantity: 3, description: 'SEL1635GM 광각 줌 렌즈' },
    { name: '소니 12-24mm', category: '렌즈', totalQuantity: 3, description: 'SEL1224GM 초광각 줌 렌즈' },
    { name: '소니 24-105mm', category: '렌즈', totalQuantity: 10, description: 'SEL24105G 표준 줌 렌즈' },
    { name: '소니 70-200mm', category: '렌즈', totalQuantity: 3, description: 'SEL70200GM 망원 줌 렌즈' },
    { name: '소니 35mm', category: '렌즈', totalQuantity: 4, description: 'SEL35F14GM 단렌즈' },
    { name: '소니 50mm', category: '렌즈', totalQuantity: 4, description: 'SEL50F12GM 단렌즈' },
    { name: '소니 85mm', category: '렌즈', totalQuantity: 3, description: 'SEL85F14GM 단렌즈' },
    { name: '소니 100mm', category: '렌즈', totalQuantity: 2, description: 'SEL100F28GM 단렌즈' },
    { name: '소니 100-400mm', category: '렌즈', totalQuantity: 1, description: 'SEL100400GM 초망원 줌 렌즈' },

    // 영상 장비
    { name: '짐벌', category: '영상 장비', totalQuantity: 3, description: '3축 카메라 짐벌 스태빌라이저' },
    { name: '드론', category: '영상 장비', totalQuantity: 5, description: '항공 촬영용 드론' },
    { name: 'LCD 모니터', category: '영상 장비', totalQuantity: 3, description: '외장 모니터' },
    { name: 'VR', category: '영상 장비', totalQuantity: 12, description: 'VR 헤드셋' },
    { name: '5.5인치 모니터', category: '영상 장비', totalQuantity: 10, description: '5.5인치 소형 외장 모니터' },

    // 조명
    { name: '조명 배터리', category: '조명', totalQuantity: 10, description: '조명용 외장 배터리' },
    { name: '조명 스탠드', category: '조명', totalQuantity: 6, description: '조명 스탠드 (샌트)' },

    // 저장 매체
    { name: 'SD카드', category: '저장 매체', totalQuantity: 12, description: 'UHS-II SD 메모리 카드' },
    { name: '소니 CF카드', category: '저장 매체', totalQuantity: 20, description: 'Sony CFexpress Type A 카드' },
    { name: 'CF카드 리더기', category: '저장 매체', totalQuantity: 9, description: 'CFexpress 카드 리더기' },
    { name: 'CF Type C', category: '저장 매체', totalQuantity: 20, description: 'CFexpress Type C 카드' },
    { name: '리더기', category: '저장 매체', totalQuantity: 8, description: '메모리 카드 리더기' },

    // 삼각대 / 지지대
    { name: '서틀리 삼각대', category: '삼각대/지지대', totalQuantity: 10, description: '서틀리(Sachtler) 비디오 삼각대' },
    { name: '스몰리그 삼각대', category: '삼각대/지지대', totalQuantity: 13, description: '스몰리그(SmallRig) 경량 삼각대' },
    { name: '매직암', category: '삼각대/지지대', totalQuantity: 20, description: '마운트용 매직암' },

    // 필터
    { name: '매트박스/가변 ND', category: '필터', totalQuantity: 10, description: '매트박스 + 가변 ND 필터' },
    { name: 'XLR 탑핸들', category: '필터', totalQuantity: 6, description: 'XLR 입력 탑핸들' },
    { name: 'ND 0.3 필터', category: '필터', totalQuantity: 6, description: 'ND 0.3 (1스탑) 필터' },
    { name: 'ND 0.6 필터', category: '필터', totalQuantity: 6, description: 'ND 0.6 (2스탑) 필터' },
    { name: 'ND 0.9 필터', category: '필터', totalQuantity: 6, description: 'ND 0.9 (3스탑) 필터' },
    { name: 'ND 1.2 필터', category: '필터', totalQuantity: 6, description: 'ND 1.2 (4스탑) 필터' },
    { name: 'ND 1.5 필터', category: '필터', totalQuantity: 6, description: 'ND 1.5 (5스탑) 필터' },
    { name: 'IRND 0.3 필터', category: '필터', totalQuantity: 6, description: 'IR 차단 ND 0.3 필터' },
    { name: 'IRND 0.6 필터', category: '필터', totalQuantity: 6, description: 'IR 차단 ND 0.6 필터' },
    { name: 'IRND 0.9 필터', category: '필터', totalQuantity: 6, description: 'IR 차단 ND 0.9 필터' },
    { name: 'IRND 1.2 필터', category: '필터', totalQuantity: 6, description: 'IR 차단 ND 1.2 필터' },
    { name: 'IRND 1.5 필터', category: '필터', totalQuantity: 6, description: 'IR 차단 ND 1.5 필터' },

    // 배터리
    { name: 'FX3/A7M4 배터리', category: '배터리', totalQuantity: 30, description: 'FX3/A7M4 대용량 교체 배터리' },
    { name: '스몰리그 모니터 배터리', category: '배터리', totalQuantity: 12, description: '스몰리그 외장 모니터용 배터리' },
    { name: 'Z90 배터리', category: '배터리', totalQuantity: 20, description: '소니 Z90 교체 배터리' },

    // 음향
    { name: '무선 마이크 세트', category: '음향', totalQuantity: 10, description: '무선 송수신 마이크 세트' },
    { name: '무선 마이크 선 3.5mm', category: '음향', totalQuantity: 5, description: '무선 마이크 3.5mm 연결 케이블' },
    { name: '젠하이저 붐마이크', category: '음향', totalQuantity: 3, description: '젠하이저 샷건 붐마이크' },
    { name: '헤드셋', category: '음향', totalQuantity: 40, description: '모니터링 헤드셋' },
    { name: '이어폰', category: '음향', totalQuantity: 20, description: '모니터링 이어폰' },
    { name: 'XLR 케이블', category: '음향', totalQuantity: 1, description: 'XLR 오디오 케이블' },

    // 기타
    { name: '에어브러쉬', category: '기타', totalQuantity: 5, description: '에어브러쉬 세트' },
    { name: '소니 Z90 가방', category: '기타', totalQuantity: 4, description: '소니 Z90 전용 카메라 가방' },
    { name: 'HDMI 케이블', category: '기타', totalQuantity: 20, description: 'HDMI 연결 케이블' },
    { name: '릴선', category: '기타', totalQuantity: 4, description: '릴 연장 케이블' },
  ]

  const existingCount = await prisma.equipment.count()
  if (existingCount === 0) {
    await prisma.equipment.createMany({ data: equipmentData })
  }

  const classroomData = [
    { roomNumber: '공학관 301호', capacity: 50, description: '중대형 강의 및 세미나 가능', equipment: '빔프로젝터, 화이트보드, 전자교탁, 음향 시스템' },
    { roomNumber: '공학관 302호', capacity: 30, description: '소형 강의 및 그룹 토의 가능', equipment: '화이트보드, 빔프로젝터' },
    { roomNumber: '멀티미디어실', capacity: 40, description: '컴퓨터 실습 및 영상 편집 강의 가능', equipment: 'PC 40대, 빔프로젝터, 마이크 시스템' },
    { roomNumber: '공동실습실', capacity: 15, description: '소규모 세미나 및 스터디룸', equipment: '화이트보드' },
    { roomNumber: '402호', capacity: 40, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '405호', capacity: 40, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '408호', capacity: 40, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '408-1호', capacity: 30, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '503호', capacity: 40, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '507-1호', capacity: 20, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '507-2호', capacity: 20, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '507-3호', capacity: 20, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '507-4호', capacity: 20, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '507-5호', capacity: 20, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '507-6호', capacity: 20, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁' },
    { roomNumber: '공학1관 201호', capacity: 50, description: '실습 및 강의 공간', equipment: '빔프로젝터, 화이트보드, 전자교탁, 음향 시스템' }
  ]

  for (const c of classroomData) {
    await prisma.classroom.upsert({
      where: { roomNumber: c.roomNumber },
      update: {},
      create: c,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
