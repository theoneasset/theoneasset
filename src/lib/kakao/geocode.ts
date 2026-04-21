// =====================================================
// lib/kakao/geocode.ts - 카카오 주소 → 좌표 변환
// =====================================================

import axios from 'axios'

interface KakaoGeoResult {
  latitude:  number
  longitude: number
  roadAddress: string
  jibunAddress: string
}

export async function geocodeAddress(
  address: string
): Promise<KakaoGeoResult | null> {
  try {
    const { data } = await axios.get(
      'https://dapi.kakao.com/v2/local/search/address.json',
      {
        params: { query: address, analyze_type: 'similar' },
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
        timeout: 5_000,
      }
    )

    const doc = data.documents?.[0]
    if (!doc) return null

    return {
      latitude:     parseFloat(doc.y),
      longitude:    parseFloat(doc.x),
      roadAddress:  doc.road_address?.address_name ?? address,
      jibunAddress: doc.address?.address_name ?? address,
    }
  } catch (error) {
    console.error('[Kakao Geocode]', error)
    return null
  }
}

// ── 건물명으로 키워드 검색 ────────────────────────────
export async function searchBuilding(keyword: string): Promise<{
  name: string
  address: string
  latitude: number
  longitude: number
} | null> {
  try {
    const { data } = await axios.get(
      'https://dapi.kakao.com/v2/local/search/keyword.json',
      {
        params: {
          query:  keyword + ' 강남구',
          size:   1,
          sort:   'accuracy',
        },
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
        timeout: 5_000,
      }
    )

    const doc = data.documents?.[0]
    if (!doc) return null

    return {
      name:      doc.place_name,
      address:   doc.road_address_name || doc.address_name,
      latitude:  parseFloat(doc.y),
      longitude: parseFloat(doc.x),
    }
  } catch (error) {
    console.error('[Kakao Search]', error)
    return null
  }
}
