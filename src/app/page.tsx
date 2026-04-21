'use client'

// =====================================================
// app/page.tsx - 메인 대시보드
// 매물 목록 + 카카오맵 + 비용 현황 + 충돌 경고
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Listing, DashboardStats } from '@/types'
import KakaoMap from '@/components/map/KakaoMap'
import ListingsTable from '@/components/listings/ListingsTable'
import CostBanner from '@/components/dashboard/CostBanner'
import LockConflictModal from '@/components/dashboard/LockConflictModal'
import StatsBar from '@/components/dashboard/StatsBar'

// ── 현재 사용자 (실제 앱에서는 로그인 연동) ──────────
const CURRENT_USER = (() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theoneasset_user') ?? '직원A'
  }
  return '직원A'
})()

export default function DashboardPage() {
  const [listings, setListings]           = useState<Partial<Listing>[]>([])
  const [stats, setStats]                 = useState<DashboardStats | null>(null)
  const [loading, setLoading]             = useState(true)
  const [selectedListing, setSelected]    = useState<Partial<Listing> | null>(null)
  const [statusFilter, setStatusFilter]   = useState<string>('')
  const [sourceFilter, setSourceFilter]   = useState<string>('')
  const [costAlert, setCostAlert]         = useState<{ totalUsd: number; threshold: number } | null>(null)
  const [lockConflict, setLockConflict]   = useState<{ lockedBy: string; remainingMin: number } | null>(null)
  const [currentCost, setCurrentCost]     = useState<number>(0)
  const costPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 매물 목록 로드 ────────────────────────────────
  const loadListings = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (sourceFilter) params.set('source', sourceFilter)
    params.set('limit', '200')

    try {
      const res = await fetch(`/api/listings?${params}`)
      const json = await res.json()
      if (json.success) {
        setListings(json.data)

        // 통계 계산
        const data: Partial<Listing>[] = json.data
        setStats({
          totalListings: data.length,
          newToday:      data.filter(l => {
            const d = new Date(l.crawledAt ?? '')
            const today = new Date()
            return d.toDateString() === today.toDateString()
          }).length,
          inReview:      data.filter(l => l.status === '검토중').length,
          proposed:      data.filter(l => l.status === '고객제안').length,
          contracted:    data.filter(l => l.status === '계약진행').length,
          totalCostUsd:  currentCost,
        })
      }
    } catch (err) {
      console.error('[Dashboard] 매물 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sourceFilter, currentCost])

  // ── 비용 현황 폴링 (30초마다) ─────────────────────
  const loadCost = useCallback(async () => {
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cost' }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentCost(json.data.totalUsd)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadListings()
    loadCost()
    costPollRef.current = setInterval(loadCost, 30_000)
    return () => {
      if (costPollRef.current) clearInterval(costPollRef.current)
    }
  }, [loadListings, loadCost])

  // ── AI 분석 실행 ──────────────────────────────────
  const handleAnalyze = async (listing: Partial<Listing>) => {
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', listing }),
      })
      const json = await res.json()

      if (json.success) {
        // 알림 체크
        if (json.data.runningTotalUsd > currentCost + 0.9) {
          setCostAlert({
            totalUsd:  json.data.runningTotalUsd,
            threshold: Math.floor(json.data.runningTotalUsd),
          })
        }
        setCurrentCost(json.data.runningTotalUsd)
        await loadListings()
      }
    } catch (err) {
      console.error('[Dashboard] 분석 실패:', err)
    }
  }

  // ── 매물 수정 (잠금 체크 포함) ───────────────────
  const handleEdit = async (
    airtableId: string,
    fields: Record<string, unknown>
  ) => {
    const res = await fetch('/api/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airtableId, updatedBy: CURRENT_USER, fields }),
    })
    const json = await res.json()

    if (!json.success && res.status === 409) {
      setLockConflict({
        lockedBy:    json.data?.lockedBy ?? '다른 직원',
        remainingMin: json.data?.remainingMin ?? 30,
      })
      return
    }

    await loadListings()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── 헤더 ─────────────────────────────────── */}
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 20px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>
            더원에셋
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            강남 매물 트래커
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* 비용 현황 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: currentCost > 0 ? '#FEF3C7' : '#F1F5F9',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
          }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Claude 누적</span>
            <span style={{ fontWeight: 700, color: currentCost > 5 ? 'var(--color-danger)' : '#92400E' }}>
              ${currentCost.toFixed(3)}
            </span>
          </div>

          {/* 필터 */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 13,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            <option value="">전체 상태</option>
            {['신규','검토중','고객제안','계약진행','완료','보류'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 13,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            <option value="">전체 출처</option>
            {['네이버부동산','공실클럽','네이버블로그','직접입력'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={loadListings}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            새로고침
          </button>

          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', background: '#F1F5F9', borderRadius: 6, padding: '4px 10px' }}>
            {CURRENT_USER}
          </span>
        </div>
      </header>

      {/* ── 통계바 ───────────────────────────────── */}
      {stats && <StatsBar stats={stats} />}

      {/* ── 본문 (지도 + 목록) ───────────────────── */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 카카오맵 */}
        <div style={{ width: '45%', flexShrink: 0, borderRight: '1px solid var(--color-border)' }}>
          <KakaoMap
            listings={listings}
            selected={selectedListing}
            onSelect={setSelected}
          />
        </div>

        {/* 매물 목록 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
              매물 로딩 중...
            </div>
          ) : (
            <ListingsTable
              listings={listings}
              selected={selectedListing}
              currentUser={CURRENT_USER}
              onSelect={setSelected}
              onAnalyze={handleAnalyze}
              onEdit={handleEdit}
            />
          )}
        </div>
      </main>

      {/* ── 비용 알림 배너 ($1 도달 시) ─────────── */}
      {costAlert && (
        <CostBanner
          totalUsd={costAlert.totalUsd}
          threshold={costAlert.threshold}
          onClose={() => setCostAlert(null)}
        />
      )}

      {/* ── 충돌 감지 모달 ───────────────────────── */}
      {lockConflict && (
        <LockConflictModal
          lockedBy={lockConflict.lockedBy}
          remainingMin={lockConflict.remainingMin}
          onClose={() => setLockConflict(null)}
        />
      )}
    </div>
  )
}
