// =====================================================
// components/map/KakaoMap.tsx - 카카오맵 컴포넌트
// 매물 마커 + 선택 시 인포윈도우
// =====================================================

'use client'

import { useEffect, useRef } from 'react'
import type { Listing } from '@/types'

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        Map: new (container: HTMLElement, options: object) => KakaoMap
        LatLng: new (lat: number, lng: number) => object
        Marker: new (options: object) => KakaoMarker
        InfoWindow: new (options: object) => KakaoInfoWindow
        MarkerImage: new (src: string, size: object, options?: object) => object
        Size: new (w: number, h: number) => object
        Point: new (x: number, y: number) => object
      }
    }
  }
}
interface KakaoMap { setCenter(latlng: object): void }
interface KakaoMarker {
  setMap(map: object | null): void
  getPosition(): object
  addListener(event: string, cb: () => void): void
}
interface KakaoInfoWindow {
  open(map: object, marker: object): void
  close(): void
}

interface Props {
  listings:  Partial<Listing>[]
  selected:  Partial<Listing> | null
  onSelect:  (listing: Partial<Listing>) => void
}

// 상태별 마커 색상
const STATUS_COLORS: Record<string, string> = {
  '신규':    '#E8593C',
  '검토중':  '#F59E0B',
  '고객제안': '#3B82F6',
  '계약진행': '#10B981',
  '완료':    '#6B7280',
  '보류':    '#9CA3AF',
}

export default function KakaoMap({ listings, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<object | null>(null)
  const markersRef   = useRef<KakaoMarker[]>([])
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null)

  // 카카오맵 SDK 초기화
  useEffect(() => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!containerRef.current) return

        const center = new window.kakao.maps.LatLng(37.4989, 127.0276) // 강남구 중심
        mapRef.current = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 5,
        })
      })
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !window.kakao) return

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // 좌표 있는 매물만 마커 생성
    const validListings = listings.filter(l => l.latitude && l.longitude)

    validListings.forEach(listing => {
      const position = new window.kakao.maps.LatLng(listing.latitude!, listing.longitude!)

      // 상태별 SVG 마커
      const color = STATUS_COLORS[listing.status ?? '신규'] ?? '#E8593C'
      const svgMarker = `
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 6.627 8 24 16 24S32 22.627 32 16C32 7.163 24.837 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
          <text x="16" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">${listing.aiScore ?? '?'}</text>
        </svg>
      `
      const blob = new Blob([svgMarker], { type: 'image/svg+xml' })
      const url  = URL.createObjectURL(blob)

      const markerImage = new window.kakao.maps.MarkerImage(
        url,
        new window.kakao.maps.Size(32, 40),
        { offset: new window.kakao.maps.Point(16, 40) }
      )

      const marker = new window.kakao.maps.Marker({
        position,
        image:    markerImage,
        map:      mapRef.current,
        title:    listing.address,
        clickable: true,
      })

      marker.addListener('click', () => {
        // 인포윈도우
        if (infoWindowRef.current) infoWindowRef.current.close()

        const infoContent = `
          <div style="padding:12px 16px;min-width:240px;font-family:'Pretendard','Noto Sans KR',sans-serif">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1a1a2e">
              ${listing.buildingName ?? listing.address}
            </div>
            <div style="font-size:12px;color:#666;margin-bottom:4px">${listing.address}</div>
            <div style="display:flex;gap:8px;margin-top:8px">
              ${listing.area ? `<span style="font-size:11px;background:#f0efe8;padding:2px 8px;border-radius:10px">${listing.area}㎡</span>` : ''}
              ${listing.monthlyRent ? `<span style="font-size:11px;background:#fff0ed;color:#e8593c;padding:2px 8px;border-radius:10px">월${listing.monthlyRent.toLocaleString()}만</span>` : ''}
              <span style="font-size:11px;background:${color}20;color:${color};padding:2px 8px;border-radius:10px">${listing.status}</span>
            </div>
          </div>
        `
        const infoWindow = new window.kakao.maps.InfoWindow({
          content: infoContent,
          removable: true,
        })
        infoWindow.open(mapRef.current!, marker)
        infoWindowRef.current = infoWindow

        onSelect(listing)
      })

      markersRef.current.push(marker)
    })
  }, [listings, onSelect])

  // 선택된 매물로 지도 이동
  useEffect(() => {
    if (!mapRef.current || !selected?.latitude || !window.kakao) return
    const latlng = new window.kakao.maps.LatLng(selected.latitude, selected.longitude!)
    ;(mapRef.current as KakaoMap).setCenter(latlng)
  }, [selected])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 범례 */}
      <div style={{
        position:   'absolute', bottom: 16, left: 16,
        background: 'white', borderRadius: 8, padding: '10px 14px',
        boxShadow:  '0 2px 8px rgba(0,0,0,0.15)', fontSize: 11,
        display:    'flex', flexDirection: 'column', gap: 4,
      }}>
        {Object.entries(STATUS_COLORS).slice(0, 4).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ color: '#555' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
