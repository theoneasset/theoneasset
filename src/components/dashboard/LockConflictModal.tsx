'use client'

// =====================================================
// components/dashboard/LockConflictModal.tsx
// 다른 직원이 편집 중일 때 충돌 감지 경고 모달
// =====================================================

interface Props {
  lockedBy:    string
  remainingMin: number
  onClose:     () => void
}

export default function LockConflictModal({ lockedBy, remainingMin, onClose }: Props) {
  return (
    <div className="lock-conflict-overlay">
      <div className="lock-conflict-modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
              편집 충돌 감지
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              다른 직원이 이 매물을 편집 중입니다
            </div>
          </div>
        </div>

        <div style={{
          background: '#FEF3C7',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
            현재 편집 중: {lockedBy} 님
          </div>
          <div style={{ color: '#A16207', fontSize: 12 }}>
            약 <strong>{remainingMin}분</strong> 후 자동으로 잠금이 해제됩니다.
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          편집을 기다리거나, {lockedBy} 님에게 연락하여 편집을 완료하도록 요청하세요.
          잠금은 30분 비활동 후 자동으로 해제됩니다.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
