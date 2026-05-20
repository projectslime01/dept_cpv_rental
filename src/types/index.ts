// src/types/index.ts
export type EquipmentStatus = 'active' | 'inactive'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'returned'

export interface EquipmentWithStats {
  id: number
  name: string
  category: string
  description: string | null
  imageUrl: string | null
  totalQuantity: number
  status: EquipmentStatus
  rentedQuantity: number
  availableQuantity: number
  createdAt: Date
}

export interface RentalRequestDetail {
  id: number
  requestNumber: string
  applicantName: string
  studentId: string
  phone: string
  equipmentId: number
  equipmentName: string
  quantity: number
  startAt: Date
  endAt: Date
  purpose: string | null
  status: RequestStatus
  adminNote: string | null
  returnedAt: Date | null
  createdAt: Date
}
