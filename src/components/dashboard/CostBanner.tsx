'use client'

// =====================================================
// components/dashboard/CostBanner.tsx
// Claude API 누적 $1 도달 시 화면 우상단 알림 배너
// =====================================================

interface Props {
  totalUsd:  number
  threshold: number
  onClose:   () => void
}

export default function CostBanner({ totalUsd, threshold, onClose }: Props) {
  return (
    <div className="cost-alert-banner" style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18 }}>💰</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 2 }}>
            Claude 비용 알림
          </div>
          <div style={{ fontSize: 12, color: '#78350F' }}>
            누적 비용이 <strong>${threshold.toFixed(0)}</strong>에 도달했습니다.
          </div>
          <div style={{ fontSize: 11, color: '#A16207', marginTop: 2 }}>
            현재 총 누적: <strong>${totalUsd.toFixed(4)}</strong>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: '#92400E',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
