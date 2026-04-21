// =====================================================
// lib/claude/client.ts - Claude API 클라이언트
// 토큰 비용 계산 + 누적 $1 알림 + 대시보드 표시
// =====================================================

import Anthropic from '@anthropic-ai/sdk'
import { saveCostRecord, getTotalCost } from '@/lib/airtable/client'
import type { CostRecord, Listing } from '@/types'

// ── Claude Sonnet 4 가격 (2025.04 기준) ───────────────
const PRICING = {
  'claude-sonnet-4-20250514': {
    input:  3.00 / 1_000_000,   // $3.00 / 1M input tokens
    output: 15.00 / 1_000_000,  // $15.00 / 1M output tokens
  },
} as const

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

// ── 비용 계산 ─────────────────────────────────────────
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCostUsd: number; outputCostUsd: number; totalCostUsd: number } {
  const price = PRICING[model as keyof typeof PRICING] ?? PRICING[DEFAULT_MODEL]
  const inputCostUsd  = inputTokens  * price.input
  const outputCostUsd = outputTokens * price.output
  const totalCostUsd  = inputCostUsd + outputCostUsd
  return { inputCostUsd, outputCostUsd, totalCostUsd }
}

// ── $1 알림 임계값 체크 ──────────────────────────────
async function checkCostAlert(
  newTotal: number,
  previousTotal: number
): Promise<{ shouldAlert: boolean; threshold: number }> {
  const alertStep = parseFloat(process.env.CLAUDE_COST_ALERT_USD ?? '1.00')
  
  const prevThresholdCount = Math.floor(previousTotal / alertStep)
  const newThresholdCount  = Math.floor(newTotal / alertStep)
  
  if (newThresholdCount > prevThresholdCount) {
    const threshold = newThresholdCount * alertStep
    console.log(`[Cost] 💰 알림: 누적 비용 $${newTotal.toFixed(4)} — $${threshold} 임계값 도달!`)
    return { shouldAlert: true, threshold }
  }
  
  return { shouldAlert: false, threshold: 0 }
}

// ── Claude API 호출 (비용 추적 포함) ─────────────────
export async function callClaude(
  messages: Anthropic.MessageParam[],
  options: {
    purpose: string
    listingId?: string
    systemPrompt?: string
    maxTokens?: number
  }
): Promise<{
  content: string
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  alertTriggered: boolean
  alertThreshold?: number
  runningTotalUsd: number
}> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // 이전 누적 비용 조회 (알림 임계값 비교용)
  const previousTotal = await getTotalCost()

  const response = await client.messages.create({
    model:      DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 1000,
    system:     options.systemPrompt,
    messages,
  })

  const inputTokens  = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const costs        = calculateCost(DEFAULT_MODEL, inputTokens, outputTokens)
  
  const content = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('\n')

  // 비용 레코드 Airtable 저장
  const costRecord: Omit<CostRecord, 'id' | 'airtableId'> = {
    timestamp:     new Date().toISOString(),
    model:         DEFAULT_MODEL,
    inputTokens,
    outputTokens,
    inputCostUsd:  costs.inputCostUsd,
    outputCostUsd: costs.outputCostUsd,
    totalCostUsd:  costs.totalCostUsd,
    purpose:       options.purpose,
    listingId:     options.listingId,
  }
  
  await saveCostRecord(costRecord)

  const newTotal = previousTotal + costs.totalCostUsd
  const { shouldAlert, threshold } = await checkCostAlert(newTotal, previousTotal)

  console.log(
    `[Claude] ${options.purpose} | ` +
    `in:${inputTokens}tok out:${outputTokens}tok | ` +
    `$${costs.totalCostUsd.toFixed(6)} | ` +
    `누적: $${newTotal.toFixed(4)}`
  )

  return {
    content,
    inputTokens,
    outputTokens,
    totalCostUsd:     costs.totalCostUsd,
    alertTriggered:   shouldAlert,
    alertThreshold:   shouldAlert ? threshold : undefined,
    runningTotalUsd:  newTotal,
  }
}

// ── 매물 AI 분석 ──────────────────────────────────────
export async function analyzeListing(listing: Listing): Promise<{
  analysis: string
  score: number
  runningTotalUsd: number
}> {
  const result = await callClaude(
    [
      {
        role: 'user',
        content: `
다음 강남구 매물을 부동산 전문가 관점에서 분석해주세요.

## 매물 정보
- 주소: ${listing.address}
- 건물명: ${listing.buildingName ?? '미상'}
- 층: ${listing.floor ?? '미상'}
- 전용면적: ${listing.area ? listing.area + '㎡' : '미상'}
- 유형: ${listing.propertyType}
- 보증금: ${listing.deposit ? listing.deposit.toLocaleString() + '만원' : '미상'}
- 월세: ${listing.monthlyRent ? listing.monthlyRent.toLocaleString() + '만원' : '미상'}
- 매매가: ${listing.salePrice ? listing.salePrice + '억원' : '미상'}
- 관리비: ${listing.maintenanceFee ? listing.maintenanceFee.toLocaleString() + '만원' : '미상'}
- 출처: ${listing.source}

## 요청사항
1. 투자/임차 관점에서 핵심 장단점 (3줄 이내)
2. 유사 매물 대비 가격 평가 (저렴/적정/높음)
3. 추천 고객 타겟 (어떤 업종/회사에 적합한지)
4. 종합 점수 (1-10점, 정수)

JSON 형식으로만 응답:
{"analysis": "...", "priceEval": "저렴|적정|높음", "target": "...", "score": 숫자}
        `.trim()
      }
    ],
    {
      purpose:   'analysis',
      listingId: listing.id,
      systemPrompt: '당신은 서울 강남구 상업용 부동산 전문가입니다. 간결하고 실용적인 분석을 제공합니다.',
      maxTokens: 500,
    }
  )

  try {
    const parsed = JSON.parse(result.content)
    return {
      analysis:        parsed.analysis + ` | 가격: ${parsed.priceEval} | 타겟: ${parsed.target}`,
      score:           Math.min(10, Math.max(1, parseInt(parsed.score))),
      runningTotalUsd: result.runningTotalUsd,
    }
  } catch {
    return {
      analysis:        result.content.slice(0, 500),
      score:           5,
      runningTotalUsd: result.runningTotalUsd,
    }
  }
}

// ── 고객 제안서 생성 ──────────────────────────────────
export async function generateProposal(
  listing: Listing,
  clientRequirements: string
): Promise<{ proposal: string; runningTotalUsd: number }> {
  const result = await callClaude(
    [
      {
        role: 'user',
        content: `
강남구 오피스/상가 매물 고객 제안서를 작성해주세요.

## 매물
- 주소: ${listing.address} ${listing.buildingName ?? ''}
- 면적: ${listing.area}㎡ / 월세: ${listing.monthlyRent?.toLocaleString()}만원
- 분석: ${listing.aiAnalysis ?? '분석 예정'}

## 고객 요구사항
${clientRequirements}

## 작성 기준
- 300자 이내의 간결한 문자 발송용 제안
- 핵심 장점 2가지 강조
- 방문 유도 문구 포함
- 존댓말 사용
        `.trim()
      }
    ],
    {
      purpose:   'proposal',
      listingId: listing.id,
      systemPrompt: '당신은 더원에셋 강남지사 부동산 전문 영업사원입니다.',
      maxTokens: 400,
    }
  )

  return { proposal: result.content, runningTotalUsd: result.runningTotalUsd }
}
