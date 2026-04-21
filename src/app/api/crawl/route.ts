// =====================================================
// app/api/crawl/route.ts - 크롤링 실행 API
// GitHub Actions에서 하루 3회 호출
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { crawlNaverRealestate } from '@/lib/crawlers/naver'
import { crawlGongsilClub }     from '@/lib/crawlers/gongsil'
import { upsertListing }        from '@/lib/airtable/client'
import { geocodeAddress }        from '@/lib/kakao/geocode'
import { notifyNewListing }      from '@/lib/solapi/client'
import type { ApiResponse, CrawlResult } from '@/types'

// CRON_SECRET으로 GitHub Actions 인증
function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

// 알림 수신 직원 번호 (환경변수에서 읽기)
const STAFF_PHONES = (process.env.STAFF_PHONES ?? '').split(',').filter(Boolean)

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 인증 ─────────────────────────────────────────────
  if (!validateCronSecret(req)) {
    return NextResponse.json(
      { success: false, error: '인증 실패', timestamp: new Date().toISOString() },
      { status: 401 }
    )
  }

  const startTime = Date.now()
  const allResults: CrawlResult[] = []
  let totalNew = 0

  try {
    // ── 병렬 크롤링 실행 ──────────────────────────────
    console.log('[Crawl] 크롤링 시작...')
    
    const [naverResult, gongsilResult] = await Promise.allSettled([
      crawlNaverRealestate(50),
      crawlGongsilClub(30),
    ])

    const crawlResults = [naverResult, gongsilResult].map(r => 
      r.status === 'fulfilled' ? r.value : null
    ).filter(Boolean) as CrawlResult[]

    allResults.push(...crawlResults)

    // ── Airtable 저장 + 지오코딩 ─────────────────────
    for (const crawlResult of crawlResults) {
      for (const listing of crawlResult.listings) {
        // 주소 → 좌표 변환
        if (listing.address && !listing.latitude) {
          const geo = await geocodeAddress(listing.address)
          if (geo) {
            listing.latitude  = geo.latitude
            listing.longitude = geo.longitude
            // 도로명 주소로 보강
            if (!listing.address.includes('구')) {
              listing.address = geo.roadAddress
            }
          }
        }

        // Airtable 저장 (중복 자동 방지)
        const { created } = await upsertListing(listing)
        if (created) {
          totalNew++
          crawlResult.newFound++
        }
      }
    }

    // ── 신규 매물 발견 시 알림톡 ──────────────────────
    if (totalNew > 0 && STAFF_PHONES.length > 0) {
      // 가장 최근 신규 매물 1건 알림
      const newListings = allResults
        .flatMap(r => r.listings)
        .filter((_, i) => i < totalNew)
      
      if (newListings[0]) {
        await notifyNewListing(newListings[0], STAFF_PHONES)
      }
    }

    const elapsed = Date.now() - startTime
    console.log(
      `[Crawl] 완료 — 총 ${allResults.reduce((s, r) => s + r.totalFound, 0)}건 발견, ` +
      `신규 ${totalNew}건 저장 (${elapsed}ms)`
    )

    return NextResponse.json({
      success:   true,
      data: {
        totalFound: allResults.reduce((s, r) => s + r.totalFound, 0),
        newSaved:   totalNew,
        sources:    allResults.map(r => ({
          source:     r.source,
          found:      r.totalFound,
          new:        r.newFound,
          errors:     r.errors,
          crawledAt:  r.crawledAt,
        })),
        elapsedMs: elapsed,
      },
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<unknown>)

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Crawl] 오류:', error)
    
    return NextResponse.json(
      {
        success:   false,
        error:     message,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// 수동 실행 지원 (GET)
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req)
}
