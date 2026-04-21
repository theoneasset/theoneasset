// =====================================================
// lib/airtable/lock.ts - 병행 제어 (Concurrency Control)
// LOCK 테이블 기반 잠금 + 30분 타임아웃 + 충돌 감지
// =====================================================

import { getRecords, createRecord, updateRecord, deleteRecord, TABLES } from './client'
import type { LockRecord, LockResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const LOCK_TIMEOUT_MS = 30 * 60 * 1000  // 30분

// ── 만료된 잠금 자동 해제 ─────────────────────────────
export async function releaseExpiredLocks(): Promise<number> {
  const now = new Date().toISOString()
  
  const expiredRecords = await getRecords(TABLES.LOCK(), {
    filterFormula: `{expiresAt} < "${now}"`,
    fields: ['expiresAt'],
  })

  let released = 0
  for (const record of expiredRecords) {
    await deleteRecord(TABLES.LOCK(), record.id)
    released++
  }

  if (released > 0) {
    console.log(`[Lock] 만료된 잠금 ${released}개 자동 해제`)
  }

  return released
}

// ── 잠금 획득 시도 ────────────────────────────────────
export async function acquireLock(
  resourceType: LockRecord['resourceType'],
  resourceId: string,
  lockedBy: string
): Promise<LockResponse> {
  // 1. 만료된 잠금 먼저 정리
  await releaseExpiredLocks()

  // 2. 현재 해당 리소스에 활성 잠금이 있는지 확인
  const existing = await getRecords(TABLES.LOCK(), {
    filterFormula: `AND({resourceType} = "${resourceType}", {resourceId} = "${resourceId}")`,
    maxRecords: 1,
  })

  if (existing.length > 0) {
    const lock = existing[0].fields
    const lockedByOther = lock.lockedBy as string
    const expiresAt = lock.expiresAt as string
    const remainMs = new Date(expiresAt).getTime() - Date.now()

    // 충돌 감지 경고
    console.warn(
      `[Lock] 충돌 감지! ${resourceType}/${resourceId} 는 ` +
      `"${lockedByOther}" 님이 사용 중 (${Math.ceil(remainMs / 60000)}분 후 만료)`
    )

    return {
      acquired: false,
      lockedBy: lockedByOther,
      lockedAt: lock.lockedAt as string,
      expiresAt,
      waitMs: remainMs > 0 ? remainMs : 0,
    }
  }

  // 3. 잠금 레코드 생성
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS)
  const sessionId = uuidv4()

  const record = await createRecord(TABLES.LOCK(), {
    resourceType,
    resourceId,
    lockedBy,
    lockedAt:  now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId,
  })

  console.log(`[Lock] 잠금 획득: ${resourceType}/${resourceId} by "${lockedBy}"`)

  return {
    acquired:  true,
    lockId:    record.id,
    lockedBy,
    lockedAt:  now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
}

// ── 잠금 해제 ─────────────────────────────────────────
export async function releaseLock(
  lockId: string,
  requestedBy: string
): Promise<{ released: boolean; reason?: string }> {
  try {
    const records = await getRecords(TABLES.LOCK(), {
      filterFormula: `RECORD_ID() = "${lockId}"`,
      maxRecords: 1,
    })

    if (records.length === 0) {
      return { released: false, reason: '잠금 레코드를 찾을 수 없습니다' }
    }

    const lock = records[0]
    const lockedBy = lock.fields.lockedBy as string

    // 본인이 생성한 잠금만 해제 가능
    if (lockedBy !== requestedBy) {
      return { 
        released: false, 
        reason: `이 잠금은 "${lockedBy}" 님의 잠금입니다. 본인 잠금만 해제할 수 있습니다.` 
      }
    }

    await deleteRecord(TABLES.LOCK(), lock.id)
    console.log(`[Lock] 잠금 해제: ${lockId} by "${requestedBy}"`)
    
    return { released: true }
  } catch (error) {
    console.error('[Lock] 잠금 해제 실패:', error)
    return { released: false, reason: '잠금 해제 중 오류가 발생했습니다' }
  }
}

// ── 잠금 갱신 (30분 연장) ─────────────────────────────
export async function renewLock(
  lockId: string,
  requestedBy: string
): Promise<{ renewed: boolean; expiresAt?: string }> {
  const records = await getRecords(TABLES.LOCK(), {
    filterFormula: `RECORD_ID() = "${lockId}"`,
    maxRecords: 1,
  })

  if (records.length === 0) return { renewed: false }

  const lock = records[0]
  if ((lock.fields.lockedBy as string) !== requestedBy) {
    return { renewed: false }
  }

  const newExpiry = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString()
  await updateRecord(TABLES.LOCK(), lock.id, { expiresAt: newExpiry })

  return { renewed: true, expiresAt: newExpiry }
}

// ── 리소스의 현재 잠금 상태 조회 ─────────────────────
export async function getLockStatus(
  resourceType: LockRecord['resourceType'],
  resourceId: string
): Promise<{ locked: boolean; lockedBy?: string; expiresAt?: string; remainingMin?: number }> {
  await releaseExpiredLocks()

  const records = await getRecords(TABLES.LOCK(), {
    filterFormula: `AND({resourceType} = "${resourceType}", {resourceId} = "${resourceId}")`,
    maxRecords: 1,
  })

  if (records.length === 0) return { locked: false }

  const lock = records[0].fields
  const expiresAt = lock.expiresAt as string
  const remainMs = new Date(expiresAt).getTime() - Date.now()

  return {
    locked:       true,
    lockedBy:     lock.lockedBy as string,
    expiresAt,
    remainingMin: Math.ceil(remainMs / 60000),
  }
}

// ── 특정 직원의 모든 잠금 조회 ───────────────────────
export async function getUserLocks(
  lockedBy: string
): Promise<LockRecord[]> {
  const records = await getRecords(TABLES.LOCK(), {
    filterFormula: `{lockedBy} = "${lockedBy}"`,
  })

  return records.map(r => ({
    id:           r.id,
    airtableId:   r.id,
    resourceType: r.fields.resourceType as LockRecord['resourceType'],
    resourceId:   r.fields.resourceId as string,
    lockedBy:     r.fields.lockedBy as string,
    lockedAt:     r.fields.lockedAt as string,
    expiresAt:    r.fields.expiresAt as string,
    sessionId:    r.fields.sessionId as string,
  }))
}
