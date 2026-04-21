// =====================================================
// types/index.ts - 더원에셋 강남 매물 트래커 타입 정의
// =====================================================

// ── 매물 상태 ────────────────────────────────────────
export type ListingStatus = 
  | '신규'
  | '검토중'
  | '고객제안'
  | '계약진행'
  | '완료'
  | '보류'

// ── 매물 출처 ────────────────────────────────────────
export type ListingSource = 
  | '네이버부동산'
  | '공실클럽'
  | '네이버블로그'
  | '직접입력'

// ── 매물 타입 ────────────────────────────────────────
export type PropertyType = 
  | '오피스'
  | '상가'
  | '꼬마빌딩'
  | '지식산업센터'
  | '기타'

// ── 핵심 매물 데이터 ─────────────────────────────────
export interface Listing {
  id: string
  airtableId?: string
  
  // 기본 정보
  address: string
  buildingName?: string
  floor?: string
  area?: number        // 전용면적 (㎡)
  areaRent?: number   // 임대면적 (㎡)
  propertyType: PropertyType
  
  // 가격
  deposit?: number    // 보증금 (만원)
  monthlyRent?: number // 월세 (만원)
  salePrice?: number  // 매매가 (억원)
  maintenanceFee?: number // 관리비 (만원)
  
  // 위치
  latitude?: number
  longitude?: number
  district?: string   // 동 (역삼동, 삼성동 등)
  
  // 메타
  source: ListingSource
  sourceUrl?: string
  status: ListingStatus
  
  // 담당자
  assignedTo?: string
  
  // 분석
  aiAnalysis?: string
  aiScore?: number    // Claude 분석 점수 1-10
  
  // 시간
  crawledAt: string
  createdAt: string
  updatedAt: string
  
  // 잠금
  lockedBy?: string
  lockedAt?: string
}

// ── 건물 데이터 ──────────────────────────────────────
export interface Building {
  id: string
  airtableId?: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  builtYear?: number
  floors?: number
  totalArea?: number
  propertyType: PropertyType
  nearestSubway?: string
  subwayDistance?: number // 도보 분
  parkingSpaces?: number
  notes?: string
}

// ── LOCK 테이블 ──────────────────────────────────────
export interface LockRecord {
  id: string
  airtableId?: string
  resourceType: 'listing' | 'building' | 'proposal'
  resourceId: string
  lockedBy: string      // 직원 이름 또는 ID
  lockedAt: string      // ISO 8601
  expiresAt: string     // lockedAt + 30분
  sessionId: string
}

// ── 비용 추적 ────────────────────────────────────────
export interface CostRecord {
  id: string
  airtableId?: string
  timestamp: string
  model: string
  inputTokens: number
  outputTokens: number
  inputCostUsd: number
  outputCostUsd: number
  totalCostUsd: number
  purpose: string       // 'analysis' | 'proposal' | 'content'
  listingId?: string
}

export interface CostSummary {
  totalUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  recordCount: number
  lastAlertAt?: string
  nextAlertThreshold: number
}

// ── 고객 ─────────────────────────────────────────────
export interface Client {
  id: string
  airtableId?: string
  name: string
  company?: string
  phone: string
  email?: string
  requirements?: string
  budget?: string
  preferredArea?: string
  assignedTo?: string
  createdAt: string
}

// ── 제안서 ───────────────────────────────────────────
export interface Proposal {
  id: string
  airtableId?: string
  listingId: string
  clientId: string
  content: string       // Claude 생성 제안서
  status: '초안' | '발송' | '검토중' | '수락' | '거절'
  createdBy: string
  createdAt: string
}

// ── 크롤링 결과 ──────────────────────────────────────
export interface CrawlResult {
  source: ListingSource
  listings: Partial<Listing>[]
  crawledAt: string
  totalFound: number
  newFound: number
  errors: string[]
}

// ── API 응답 래퍼 ─────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// ── 병행 제어 응답 ───────────────────────────────────
export interface LockResponse {
  acquired: boolean
  lockId?: string
  lockedBy?: string
  lockedAt?: string
  expiresAt?: string
  waitMs?: number
}

// ── 대시보드 통계 ─────────────────────────────────────
export interface DashboardStats {
  totalListings: number
  newToday: number
  inReview: number
  proposed: number
  contracted: number
  totalCostUsd: number
  crawlerLastRun?: string
}
