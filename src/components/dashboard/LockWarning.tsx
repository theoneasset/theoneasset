// =====================================================
// components/dashboard/LockWarning.tsx
// 동시 편집 충돌 경고 모달
// =====================================================

'use client'

interface Props {
  message:     string
  lockedBy:    string
  remainingMin: number
  onClose:     () => void
}

export default function LockWarning({ message, lockedBy, remainingMin, onClose }: Props) {
  return (
    <div className="lock-overlay">
      <div className="lock-modal">
        <div className="lock-icon">🔒</div>
        <h3>편집 잠금 충돌</h3>
        <p className="lock-message">{message}</p>
        <div className="lock-detail">
          <div className="lock-row">
            <span className="lock-label">편집 중인 직원</span>
            <span className="lock-value">{lockedBy}</span>
          </div>
          <div className="lock-row">
            <span className="lock-label">자동 해제까지</span>
            <span className="lock-value lock-timer">{remainingMin}분</span>
          </div>
        </div>
        <p className="lock-hint">
          잠시 후 다시 시도하거나, {lockedBy} 님에게 연락하여 편집을 완료해달라고 요청하세요.
        </p>
        <button className="lock-close-btn" onClick={onClose}>확인</button>
      </div>

      <style jsx>{`
        .lock-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
        }
        .lock-modal {
          background: white; border-radius: 16px;
          padding: 32px; width: 360px;
          text-align: center;
          box-shadow: 0 8px 40px rgba(0,0,0,0.2);
          animation: popIn 0.25s ease;
        }
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .lock-icon  { font-size: 40px; margin-bottom: 12px; }
        h3          { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #1a1a2e; }
        .lock-message { font-size: 13px; color: #e8593c; margin: 0 0 20px; font-weight: 500; }
        .lock-detail {
          background: #f8f7f3; border-radius: 10px;
          padding: 16px; margin-bottom: 16px;
        }
        .lock-row {
          display: flex; justify-content: space-between;
          padding: 4px 0; font-size: 13px;
        }
        .lock-label { color: #888; }
        .lock-value { font-weight: 600; color: #1a1a2e; }
        .lock-timer { color: #e8593c; }
        .lock-hint  { font-size: 12px; color: #aaa; line-height: 1.6; margin-bottom: 20px; }
        .lock-close-btn {
          width: 100%; padding: 12px; background: #1a1a2e;
          color: white; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .lock-close-btn:hover { background: #2a2a4e; }
      `}</style>
    </div>
  )
}
