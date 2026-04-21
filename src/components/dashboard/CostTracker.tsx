// =====================================================
// components/dashboard/CostTracker.tsx
// Claude API 누적 비용 표시 + $1 임계값 알림 배너
// =====================================================

'use client'

import { useEffect, useState } from 'react'

interface Props {
  totalUsd: number
  nextAlertThreshold: number
}

export default function CostTracker({ totalUsd, nextAlertThreshold }: Props) {
  const [showAlert, setShowAlert] = useState(false)
  const [prevTotal, setPrevTotal] = useState(totalUsd)

  // $1 임계값 도달 시 화면 알림
  useEffect(() => {
    const alertStep = 1.00
    const prevCount = Math.floor(prevTotal / alertStep)
    const currCount = Math.floor(totalUsd / alertStep)

    if (currCount > prevCount && currCount > 0) {
      setShowAlert(true)
      // 8초 후 자동 닫힘
      const timer = setTimeout(() => setShowAlert(false), 8000)
      return () => clearTimeout(timer)
    }
    setPrevTotal(totalUsd)
  }, [totalUsd, prevTotal])

  const percentage = ((totalUsd % nextAlertThreshold) / nextAlertThreshold) * 100
  const remaining  = nextAlertThreshold - totalUsd

  return (
    <>
      {/* ── $1 도달 알림 배너 ── */}
      {showAlert && (
        <div className="cost-alert-banner">
          <span className="alert-icon">💰</span>
          <strong>Claude API 누적 비용 ${Math.floor(totalUsd)}에 도달했습니다!</strong>
          <span className="alert-sub">솔라피 알림톡도 발송되었습니다</span>
          <button onClick={() => setShowAlert(false)}>✕</button>
        </div>
      )}

      {/* ── 상시 비용 현황 바 ── */}
      <div className="cost-tracker">
        <div className="cost-label">
          <span className="cost-icon">⚡</span>
          <span className="cost-title">Claude API 비용</span>
          <span className="cost-total">${totalUsd.toFixed(4)}</span>
          <span className="cost-divider">/</span>
          <span className="cost-next">다음 알림: ${nextAlertThreshold.toFixed(2)}</span>
        </div>
        <div className="cost-bar-wrap">
          <div
            className="cost-bar-fill"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span className="cost-remain">${remaining.toFixed(4)} 남음</span>
      </div>

      <style jsx>{`
        .cost-alert-banner {
          position: fixed;
          top: 64px;
          right: 20px;
          z-index: 9999;
          background: #1a1a2e;
          color: white;
          padding: 14px 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease;
          max-width: 420px;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        .alert-icon   { font-size: 20px; }
        .alert-sub    { font-size: 12px; opacity: 0.7; margin-left: 4px; }
        .cost-alert-banner button {
          margin-left: auto; background: none; border: none; color: white;
          cursor: pointer; font-size: 16px; opacity: 0.6;
          padding: 0 0 0 8px;
        }
        .cost-tracker {
          background: white;
          border-bottom: 1px solid #e0dfd8;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          height: 48px;
        }
        .cost-icon    { font-size: 14px; }
        .cost-title   { font-size: 12px; color: #888; font-weight: 500; }
        .cost-total   { font-size: 13px; font-weight: 700; color: #1a1a2e; font-variant-numeric: tabular-nums; }
        .cost-divider { color: #ccc; }
        .cost-next    { font-size: 12px; color: #aaa; }
        .cost-bar-wrap {
          flex: 1;
          height: 6px;
          background: #f0efe8;
          border-radius: 3px;
          overflow: hidden;
          max-width: 200px;
        }
        .cost-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #E8593C);
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .cost-remain { font-size: 11px; color: #bbb; font-variant-numeric: tabular-nums; white-space: nowrap; }
      `}</style>
    </>
  )
}
