// =====================================================
// lib/crawlers/naver.ts - 네이버부동산 크롤러
// Playwright 기반 (JavaScript 렌더링 필요)
// =====================================================

import { chromium } from 'playwright'
import type { CrawlResult, Listing } from '@/types'

// 강남구 주요 동 코드 (네이버부동산)
const GANGNAM_DISTRICTS = [
  { name: '역삼동',  code: '1168010100' },
  { name: '삼성동',  code: '1168010200' },
  { name: '논현동',  code: '1168010300' },
  { name: '청담동',  code: '1168010700' },
  { name: '대치동',  code: '1168010400' },
  { name: '개포동',  code: '1168010500' },
  { name: '도곡동',  code: '1168010600' },
]

export async function crawlNaverRealestate(
  maxListings = 50
): Promise<CrawlResult> {
  const result: CrawlResult = {
    source:      '네이버부동산',
    listings:    [],
    crawledAt:   new Date().toISOString(),
    totalFound:  0,
    newFound:    0,
    errors:      [],
  }

  let browser = null
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    })

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'ko-KR',
    })

    const page = await context.newPage()

    // 네이버부동산 오피스/상가 검색 (강남구)
    // 실제 URL은 네이버부동산 구조 변경에 따라 조정 필요
    const targetUrl = 
      'https://land.naver.com/office/?cortarNo=1168000000&dealType=&tradeType=B2'

    await page.goto(targetUrl, { 
      waitUntil: 'networkidle',
      timeout: 30_000,
    })

    // 네이버부동산은 SPA - 목록이 로드될 때까지 대기
    await page.waitForSelector('.item_link, .item_inner', { timeout: 15_000 }).catch(() => {
      result.errors.push('네이버부동산 목록 로드 타임아웃')
    })

    // 매물 목록 파싱
    const rawListings = await page.evaluate(() => {
      const items: Array<{
        address: string
        buildingName: string
        area: number
        deposit: number
        monthlyRent: number
        floor: string
        sourceUrl: string
      }> = []

      // 실제 DOM 구조에 맞게 selector 조정 필요
      document.querySelectorAll('.item_inner').forEach((el) => {
        const address    = el.querySelector('.address')?.textContent?.trim() ?? ''
        const name       = el.querySelector('.name')?.textContent?.trim() ?? ''
        const areaText   = el.querySelector('.area')?.textContent?.trim() ?? '0'
        const priceText  = el.querySelector('.price')?.textContent?.trim() ?? ''
        const floorText  = el.querySelector('.floor')?.textContent?.trim() ?? ''
        const link       = el.querySelector('a')?.href ?? ''

        // 가격 파싱 (예: "보증금 1,000 / 월세 100")
        const depositMatch     = priceText.match(/보증금\s*([\d,]+)/)
        const monthlyRentMatch = priceText.match(/월세\s*([\d,]+)/)

        items.push({
          address,
          buildingName: name,
          area:         parseFloat(areaText.replace(/[^0-9.]/g, '')) || 0,
          deposit:      depositMatch ? parseInt(depositMatch[1].replace(/,/g, '')) : 0,
          monthlyRent:  monthlyRentMatch ? parseInt(monthlyRentMatch[1].replace(/,/g, '')) : 0,
          floor:        floorText,
          sourceUrl:    link,
        })
      })

      return items
    })

    result.totalFound = rawListings.length

    // Listing 형식으로 변환
    result.listings = rawListings.slice(0, maxListings).map(raw => ({
      address:     raw.address || '강남구',
      buildingName: raw.buildingName,
      area:         raw.area,
      deposit:      raw.deposit,
      monthlyRent:  raw.monthlyRent,
      floor:        raw.floor,
      sourceUrl:    raw.sourceUrl,
      source:       '네이버부동산' as const,
      propertyType: '오피스' as const,
      status:       '신규' as const,
      crawledAt:    new Date().toISOString(),
    }))

    await context.close()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result.errors.push(`크롤링 오류: ${message}`)
    console.error('[Naver Crawler]', error)
  } finally {
    if (browser) await browser.close()
  }

  return result
}
