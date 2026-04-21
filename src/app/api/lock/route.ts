// =====================================================
// app/api/lock/route.ts - 병행 제어 API
// LOCK 테이블 기반 잠금 관리
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  acquireLock,
  releaseLock,
  renewLock,
  getLockStatus,
  getUserLocks,
  releaseExpiredLocks,
} from '@/lib/airtable/lock'
import type { ApiResponse } from '@/types'

// ── 잠금 획득 POST /api/lock ─────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { action, resourceType, resourceId, lockedBy, lockId } = body

    if (!lockedBy) {
      return NextResponse.json(
        { success: false, error: 'lockedBy (직원명) 필수', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    switch (action) {
      // ── 잠금 획득 ────────────────────────────────────
      case 'acquire': {
        if (!resourceType || !resourceId) {
          return NextResponse.json(
            { success: false, error: 'resourceType, resourceId 필수', timestamp: new Date().toISOString() },
            { status: 400 }
          )
        }
        const lockResult = await acquireLock(resourceType, resourceId, lockedBy)
        return NextResponse.json({
          success:   lockResult.acquired,
          data:      lockResult,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<typeof lockResult>)
      }

      // ── 잠금 해제 ────────────────────────────────────
      case 'release': {
        if (!lockId) {
          return NextResponse.json(
            { success: false, error: 'lockId 필수', timestamp: new Date().toISOString() },
            { status: 400 }
          )
        }
        const releaseResult = await releaseLock(lockId, lockedBy)
        return NextResponse.json({
          success:   releaseResult.released,
          data:      releaseResult,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<typeof releaseResult>)
      }

      // ── 잠금 갱신 (30분 연장) ────────────────────────
      case 'renew': {
        if (!lockId) {
          return NextResponse.json(
            { success: false, error: 'lockId 필수', timestamp: new Date().toISOString() },
            { status: 400 }
          )
        }
        const renewResult = await renewLock(lockId, lockedBy)
        return NextResponse.json({
          success:   renewResult.renewed,
          data:      renewResult,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<typeof renewResult>)
      }

      // ── 만료 잠금 일괄 해제 ──────────────────────────
      case 'cleanup': {
        const released = await releaseExpiredLocks()
        return NextResponse.json({
          success: true,
          data:    { released },
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `알 수 없는 action: ${action}`, timestamp: new Date().toISOString() },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

// ── 잠금 상태 조회 GET /api/lock?resourceType=...&resourceId=... ──
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const resourceType = searchParams.get('resourceType')
  const resourceId   = searchParams.get('resourceId')
  const userLocks    = searchParams.get('user')

  try {
    // 특정 직원의 잠금 목록
    if (userLocks) {
      const locks = await getUserLocks(userLocks)
      return NextResponse.json({
        success:   true,
        data:      locks,
        timestamp: new Date().toISOString(),
      })
    }

    // 특정 리소스 잠금 상태
    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { success: false, error: 'resourceType, resourceId 또는 user 쿼리 파라미터 필요', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    const status = await getLockStatus(
      resourceType as 'listing' | 'building' | 'proposal',
      resourceId
    )

    return NextResponse.json({
      success:   true,
      data:      status,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
