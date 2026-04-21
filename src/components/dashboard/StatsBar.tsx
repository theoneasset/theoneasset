// =====================================================
// components/dashboard/StatsBar.tsx - 통계 바
// =====================================================

'use client'

import type { DashboardStats } from '@/types'

interface Props { stats: DashboardStats }

export default function StatsBar({ stats }: Props) {
  const items = [
    { label: '전체 매물',  value: stats.totalListings, color: '#1a1a2e' },
    { label: '오늘 신규',  value: stats.newToday,      color: '#E8593C' },
    { label: '검토 중',    value: stats.inReview,      color: '#F59E0B' },
    { label: '고객 제안',  value: stats.proposed,      color: '#3B82F6' },
    { label: '계약 진행',  value: stats.contracted,    color: '#10B981' },
  ]

  return (
    <div className="stats-bar">
      {items.map((item) => (
        <div key={item.label} className="stat-item">
          <span className="stat-value" style={{ color: item.color }}>
            {item.value}
          </span>
          <span className="stat-label">{item.label}</span>
        </div>
      ))}
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value" style={{ color: '#8B5CF6', fontSize: '13px' }}>
          ${stats.totalCostUsd.toFixed(3)}
        </span>
        <span className="stat-label">API 비용</span>
      </div>

      <style jsx>{`
        .stats-bar {
          background: white;
          border-bottom: 1px solid #e0dfd8;
          padding: 0 24px;
          height: 80px;
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .stat-item {
          display: flex; flex-direction: column;
          align-items: center; gap: 2px;
        }
        .stat-value {
          font-size: 24px; font-weight: 800;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .stat-label { font-size: 11px; color: #999; font-weight: 500; }
        .stat-divider {
          width: 1px; height: 36px;
          background: #e0dfd8; margin: 0 8px;
        }
      `}</style>
    </div>
  )
}
