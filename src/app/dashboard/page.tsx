// =====================================================
// app/dashboard/page.tsx - 메인 대시보드
// 매물 목록 + 카카오맵 + 비용 현황 + 충돌 경고
// =====================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Listing, DashboardStats, CostSummary } from '@/types'
import ListingsTable from '@/components/listings/ListingsTable'
import KakaoMap      from '@/components/map/KakaoMap'
import CostTracker   from '@/components/dashboard/CostTracker'
import LockWarning   from '@/components/dashboard/LockWarning'
import StatsBar      from '@/components/dashboard/StatsBar'

// 현재 사용자 (실제 구현에서는 세션/로그인으로 관리)
const CURRENT_USER = process.env.NEXT_PUBLIC_CURRENT_USER ?? '직원1'

export default function DashboardPage() {
  const [listings, setListings]     = useState<Partial<Listing>[]>([])
  const [selected, setSelected]     = useState<Partial<Listing> | null>(null)
  const [stats, setStats]           = useState<DashboardStats | null>(null)
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [lockWarning, setLockWarning] = useState<{
    message: string; lockedBy: string; remainingMin: number
  } | null>(null)

  // 매물 목록 로드
  const loadListings = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200', ...filters })
      const res = await fetch(`/api/listings?${params}`)
      const json = await res.json()
      if (json.success) {
        setListings(json.data)
      } else {
        setError(json.error)
      }
    } catch (e) {
      setError('매물 목록 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  // 비용 현황 로드
  const loadCost = useCallback(async () => {
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cost' }),
      })
      const json = await res.json()
      if (json.success) {
        setCostSummary({
          totalUsd:            json.data.totalUsd,
          totalInputTokens:    0,
          totalOutputTokens:   0,
          recordCount:         0,
          nextAlertThreshold:  json.data.nextAlertThreshold,
        })
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadListings()
    loadCost()
    // 5분마다 자동 새로고침
    const interval = setInterval(() => {
      loadListings()
      loadCost()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadListings, loadCost])

  // 매물 수정 요청 (잠금 체크)
  const handleEdit = async (listing: Partial<Listing>, fields: Record<string, unknown>) => {
    const res = await fetch('/api/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        airtableId: listing.airtableId,
        updatedBy:  CURRENT_USER,
        fields,
      }),
    })
    const json = await res.json()

    if (!json.success && res.status === 409) {
      // 충돌 경고 표시
      setLockWarning({
        message:      json.error,
        lockedBy:     json.data?.lockedBy ?? '다른 직원',
        remainingMin: json.data?.remainingMin ?? 30,
      })
      return false
    }

    if (json.success) {
      await loadListings()
      return true
    }
    return false
  }

  // AI 분석 요청
  const handleAnalyze = async (listing: Partial<Listing>) => {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze', listing }),
    })
    const json = await res.json()
    if (json.success) {
      await loadListings()
      await loadCost()  // 비용 업데이트
    }
    return json
  }

  // 통계 계산
  useEffect(() => {
    if (!listings.length) return
    const today = new Date().toISOString().split('T')[0]
    setStats({
      totalListings: listings.length,
      newToday:      listings.filter(l => l.crawledAt?.startsWith(today)).length,
      inReview:      listings.filter(l => l.status === '검토중').length,
      proposed:      listings.filter(l => l.status === '고객제안').length,
      contracted:    listings.filter(l => l.status === '계약진행').length,
      totalCostUsd:  costSummary?.totalUsd ?? 0,
    })
  }, [listings, costSummary])

  return (
    <div className="dashboard-layout">
      {/* ── 상단 헤더 ── */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>더원에셋 강남</h1>
          <span className="badge-beta">매물 트래커</span>
        </div>
        <div className="header-right">
          <span className="current-user">👤 {CURRENT_USER}</span>
          <button
            className="btn-refresh"
            onClick={() => { loadListings(); loadCost() }}
          >
            새로고침
          </button>
        </div>
      </header>

      {/* ── 충돌 경고 모달 ── */}
      {lockWarning && (
        <LockWarning
          message={lockWarning.message}
          lockedBy={lockWarning.lockedBy}
          remainingMin={lockWarning.remainingMin}
          onClose={() => setLockWarning(null)}
        />
      )}

      {/* ── 통계 바 ── */}
      {stats && <StatsBar stats={stats} />}

      {/* ── 비용 추적기 ($1 알림) ── */}
      {costSummary && (
        <CostTracker
          totalUsd={costSummary.totalUsd}
          nextAlertThreshold={costSummary.nextAlertThreshold}
        />
      )}

      {/* ── 메인 콘텐츠: 지도 + 목록 ── */}
      <main className="dashboard-main">
        {/* 카카오맵 */}
        <section className="map-section">
          <KakaoMap
            listings={listings}
            selected={selected}
            onSelect={setSelected}
          />
        </section>

        {/* 매물 테이블 */}
        <section className="listings-section">
          <ListingsTable
            listings={listings}
            loading={loading}
            currentUser={CURRENT_USER}
            onSelect={setSelected}
            onEdit={handleEdit}
            onAnalyze={handleAnalyze}
            onFilter={loadListings}
          />
        </section>
      </main>

      <style jsx>{`
        .dashboard-layout {
          min-height: 100vh;
          background: #f5f4f0;
          font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
        }
        .dashboard-header {
          background: #1a1a2e;
          color: white;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-left h1 { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.3px; }
        .badge-beta {
          font-size: 11px; padding: 2px 8px; background: #e8593c;
          border-radius: 10px; font-weight: 600;
        }
        .header-right { display: flex; align-items: center; gap: 16px; }
        .current-user { font-size: 13px; opacity: 0.8; }
        .btn-refresh {
          font-size: 13px; padding: 6px 14px; background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2); color: white;
          border-radius: 6px; cursor: pointer;
        }
        .btn-refresh:hover { background: rgba(255,255,255,0.2); }
        .dashboard-main {
          display: grid;
          grid-template-columns: 420px 1fr;
          grid-template-rows: calc(100vh - 56px - 80px - 48px);
          gap: 0;
        }
        .map-section { background: white; border-right: 1px solid #e0dfd8; }
        .listings-section { overflow: hidden; }
        @media (max-width: 1024px) {
          .dashboard-main {
            grid-template-columns: 1fr;
            grid-template-rows: 360px auto;
          }
        }
      `}</style>
    </div>
  )
}
