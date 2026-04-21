// =====================================================
// lib/solapi/client.ts - 솔라피 알림톡 클라이언트
// 신규 매물 발견 / 비용 $1 알림 발송
// =====================================================

import axios from 'axios'
import crypto from 'crypto'
import type { Listing } from '@/types'

const SOLAPI_BASE_URL = 'https://api.solapi.com'

// ── 솔라피 인증 헤더 생성 ─────────────────────────────
function createAuthHeader(): string {
  const apiKey    = process.env.SOLAPI_API_KEY!
  const apiSecret = process.env.SOLAPI_API_SECRET!
  
  const date       = new Date().toISOString()
  const salt       = Math.random().toString(36).substring(2)
  const signature  = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex')

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

// ── 알림톡 발송 (단건) ────────────────────────────────
async function sendAlimtalk(params: {
  to:         string
  templateId: string
  variables:  Record<string, string>
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data } = await axios.post(
      `${SOLAPI_BASE_URL}/messages/v4/send`,
      {
        message: {
          to:           params.to,
          from:         process.env.SOLAPI_SENDER_PHONE,
          kakaoOptions: {
            pfId:     process.env.SOLAPI_KAKAO_CHANNEL_ID,
            templateId: params.templateId,
            variables: params.variables,
          },
        },
      },
      {
        headers: {
          Authorization:  createAuthHeader(),
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    )

    return { success: true, messageId: data.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Solapi] 발송 실패:', message)
    return { success: false, error: message }
  }
}

// ── 신규 매물 알림 (전 직원 발송) ────────────────────
export async function notifyNewListing(
  listing: Partial<Listing>,
  recipientPhones: string[]
): Promise<void> {
  const templateId = process.env.SOLAPI_TEMPLATE_NEW_LISTING
  if (!templateId) {
    console.warn('[Solapi] SOLAPI_TEMPLATE_NEW_LISTING 미설정 — 알림 건너뜀')
    return
  }

  const variables = {
    '#{매물주소}':  listing.address ?? '주소 미상',
    '#{건물명}':    listing.buildingName ?? '-',
    '#{층수}':      listing.floor ?? '-',
    '#{면적}':      listing.area ? `${listing.area}㎡` : '-',
    '#{보증금}':    listing.deposit ? `${listing.deposit.toLocaleString()}만원` : '-',
    '#{월세}':      listing.monthlyRent ? `${listing.monthlyRent.toLocaleString()}만원` : '-',
    '#{출처}':      listing.source ?? '-',
    '#{링크}':      listing.sourceUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '',
  }

  const promises = recipientPhones.map(phone =>
    sendAlimtalk({ to: phone, templateId, variables })
  )

  const results = await Promise.allSettled(promises)
  const success  = results.filter(r => r.status === 'fulfilled').length
  console.log(`[Solapi] 신규 매물 알림: ${success}/${recipientPhones.length}명 발송 완료`)
}

// ── Claude API 비용 $1 알림 ──────────────────────────
export async function notifyCostAlert(
  totalUsd: number,
  thresholdUsd: number,
  recipientPhones: string[]
): Promise<void> {
  const templateId = process.env.SOLAPI_TEMPLATE_COST_ALERT
  if (!templateId) {
    console.warn('[Solapi] SOLAPI_TEMPLATE_COST_ALERT 미설정 — 비용 알림 건너뜀')
    return
  }

  const variables = {
    '#{누적비용}':   `$${totalUsd.toFixed(2)}`,
    '#{임계값}':     `$${thresholdUsd.toFixed(2)}`,
    '#{대시보드}':   process.env.NEXT_PUBLIC_APP_URL ?? '',
  }

  const promises = recipientPhones.map(phone =>
    sendAlimtalk({ to: phone, templateId, variables })
  )

  await Promise.allSettled(promises)
  console.log(`[Solapi] 비용 $${thresholdUsd} 알림 발송 완료`)
}
