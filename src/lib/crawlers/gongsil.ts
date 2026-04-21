// =====================================================
// lib/crawlers/gongsil.ts - 공실클럽 크롤러
// Cheerio 기반 (정적 HTML)
// =====================================================

import axios from 'axios'
import * as cheerio from 'cheerio'
import type { CrawlResult } from '@/types'

const BASE_URL = 'https://www.gongsil.kr'

export async function crawlGongsilClub(
  maxListings = 30
): Promise<CrawlResult> {
  const result: CrawlResult = {
    source:     '공실클럽',
    listings:   [],
    crawledAt:  new Date().toISOString(),
    totalFound: 0,
    newFound:   0,
    errors:     [],
  }

  try {
    // 강남구 오피스 검색
    const searchUrl = `${BASE_URL}/search?gu=강남구&type=office&page=1`
    
    const { data: html } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': BASE_URL,
      },
      timeout: 15_000,
    })

    const $ = cheerio.load(html)
    
    // 실제 공실클럽 DOM 구조에 맞게 selector 조정 필요
    const items = $('.property-item, .listing-item').toArray()
    result.totalFound = items.length

    for (const item of items.slice(0, maxListings)) {
      const el = $(item)
      
      const address    = el.find('.address, .location').text().trim()
      const name       = el.find('.building-name, .name').text().trim()
      const areaText   = el.find('.area').text().trim()
      const priceText  = el.find('.price').text().trim()
      const floorText  = el.find('.floor').text().trim()
      const link       = el.find('a').first().attr('href') ?? ''

      // 면적 파싱 (예: "165㎡(50평)")
      const areaMatch = areaText.match(/([\d.]+)㎡/)
      const area = areaMatch ? parseFloat(areaMatch[1]) : 0

      // 가격 파싱
      const depositMatch    = priceText.match(/보[^0-9]*([\d,]+)/)
      const monthlyMatch    = priceText.match(/월[^0-9]*([\d,]+)/)

      if (address) {
        result.listings.push({
          address,
          buildingName: name || undefined,
          area:         area || undefined,
          deposit:      depositMatch ? parseInt(depositMatch[1].replace(/,/g, '')) : undefined,
          monthlyRent:  monthlyMatch ? parseInt(monthlyMatch[1].replace(/,/g, '')) : undefined,
          floor:        floorText || undefined,
          sourceUrl:    link.startsWith('http') ? link : `${BASE_URL}${link}`,
          source:       '공실클럽',
          propertyType: '오피스',
          status:       '신규',
          crawledAt:    new Date().toISOString(),
        })
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result.errors.push(`공실클럽 크롤링 오류: ${message}`)
    console.error('[Gongsil Crawler]', error)
  }

  return result
}
