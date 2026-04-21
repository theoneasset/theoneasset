// =====================================================
// app/api/claude/route.ts - Claude API 호출 엔드포인트
// 비용 추적 + $1 임계값 알림 포함
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { analyzeListing, generateProposal } from '@/lib/claude/client'
import { getTotalCost, updateRecord, TABLES } from '@/lib/airtable/client'
import { notifyCostAlert } from '@/lib/solapi/client'
import type { Listing, ApiResponse } from '@/types'

const STAFF_PHONES = (process.env.STAFF_PHONES ?? '').split(',').filter(Boolean)

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { action, listing, clientRequirements, listingId } = body

    switch (action) {
      // ── 매물 AI 분석 ────────────────────────────────
      case 'analyze': {
        if (!listing) {
          return NextResponse.json(
            { success: false, error: 'listing 데이터 필수', timestamp: new Date().toISOString() },
            { status: 400 }
          )
        }

        const result = await analyzeListing(listing as Listing)

        // Airtable 분석 결과 업데이트
        if (listing.airtableId) {
          await updateRecord(TABLES.LISTINGS(), listing.airtableId, {
            aiAnalysis: result.analysis,
            aiScore:    result.score,
          })
        }

        // 비용 $1 알림 체크 및 발송
        await handleCostAlert(result.runningTotalUsd)

        return NextResponse.json({
          success: true,
          data: {
            analysis:        result.analysis,
            score:           result.score,
            runningTotalUsd: result.runningTotalUsd,
          },
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<unknown>)
      }

      // ── 제안서 생성 ──────────────────────────────────
      case 'proposal': {
        if (!listing || !clientRequirements) {
          return NextResponse.json(
            { success: false, error: 'listing, clientRequirements 필수', timestamp: new Date().toISOString() },
            { status: 400 }
          )
        }

        const result = await generateProposal(listing as Listing, clientRequirements)
        await handleCostAlert(result.runningTotalUsd)

        return NextResponse.json({
          success: true,
          data: {
            proposal:        result.proposal,
            runningTotalUsd: result.runningTotalUsd,
          },
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<unknown>)
      }

      // ── 현재 누적 비용 조회 ──────────────────────────
      case 'cost': {
        const totalUsd = await getTotalCost()
        const alertStep = parseFloat(process.env.CLAUDE_COST_ALERT_USD ?? '1.00')
        const nextThreshold = (Math.floor(totalUsd / alertStep) + 1) * alertStep

        return NextResponse.json({
          success: true,
          data: {
            totalUsd,
            nextAlertThreshold: nextThreshold,
            remainingUntilAlert: nextThreshold - totalUsd,
          },
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<unknown>)
      }

      default:
        return NextResponse.json(
          { success: false, error: `알 수 없는 action: ${action}`, timestamp: new Date().toISOString() },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Claude API Route]', error)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

// ── 비용 $1 알림 처리 ────────────────────────────────
async function handleCostAlert(runningTotalUsd: number): Promise<void> {
  const alertStep = parseFloat(process.env.CLAUDE_COST_ALERT_USD ?? '1.00')
  const threshold = Math.floor(runningTotalUsd / alertStep) * alertStep
  
  // 임계값에 막 도달했을 때만 알림
  const prev = runningTotalUsd - 0.001  // 직전 상태 근사
  if (Math.floor(prev / alertStep) < Math.floor(runningTotalUsd / alertStep)) {
    if (STAFF_PHONES.length > 0 && threshold > 0) {
      await notifyCostAlert(runningTotalUsd, threshold, STAFF_PHONES)
    }
  }
}
