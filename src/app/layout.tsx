// =====================================================
// app/layout.tsx - 루트 레이아웃
// =====================================================

import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: '더원에셋 강남 매물 트래커',
  description: '강남구 오피스·상가 매물 자동 수집 및 분석 영업툴',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* 카카오맵 SDK */}
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}&libraries=services,clusterer`}
          strategy="beforeInteractive"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
