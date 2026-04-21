// =====================================================
// components/listings/ListingsTable.tsx
// 매물 테이블: 필터·정렬·상태변경·AI분석·제안서
// =====================================================

'use client'

import { useState } from 'react'
import type { Listing } from '@/types'

const STATUS_OPTIONS: Listing['status'][] = [
  '신규', '검토중', '고객제안', '계약진행', '완료', '보류'
]
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '신규':    { bg: '#fef0ed', text: '#e8593c' },
  '검토중':  { bg: '#fef9ec', text: '#d97706' },
  '고객제안': { bg: '#eff6ff', text: '#2563eb' },
  '계약진행': { bg: '#f0fdf4', text: '#16a34a' },
  '완료':    { bg: '#f3f4f6', text: '#6b7280' },
  '보류':    { bg: '#f5f3ff', text: '#7c3aed' },
}
const SOURCE_COLORS: Record<string, string> = {
  '네이버부동산': '#03C75A',
  '공실클럽':    '#F59E0B',
  '네이버블로그': '#03C75A',
  '직접입력':    '#6B7280',
}

interface Props {
  listings:    Partial<Listing>[]
  loading:     boolean
  currentUser: string
  onSelect:    (l: Partial<Listing>) => void
  onEdit:      (l: Partial<Listing>, fields: Record<string, unknown>) => Promise<boolean>
  onAnalyze:   (l: Partial<Listing>) => Promise<unknown>
  onFilter:    (filters: Record<string, string>) => void
}

export default function ListingsTable({
  listings, loading, currentUser,
  onSelect, onEdit, onAnalyze, onFilter,
}: Props) {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [analyzing, setAnalyzing]       = useState<string | null>(null)
  const [editingId, setEditingId]       = useState<string | null>(null)

  const handleStatusChange = async (listing: Partial<Listing>, newStatus: string) => {
    const ok = await onEdit(listing, { status: newStatus })
    if (!ok) return // 충돌 시 LockWarning이 대신 표시됨
  }

  const handleAnalyze = async (listing: Partial<Listing>) => {
    if (!listing.airtableId) return
    setAnalyzing(listing.airtableId)
    try {
      await onAnalyze(listing)
    } finally {
      setAnalyzing(null)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setFilterStatus(value)
    if (key === 'source') setFilterSource(value)
    const filters: Record<string, string> = {}
    if (key === 'status' ? value : filterStatus) filters.status = key === 'status' ? value : filterStatus
    if (key === 'source' ? value : filterSource) filters.source = key === 'source' ? value : filterSource
    onFilter(filters)
  }

  return (
    <div className="listings-wrap">
      {/* ── 필터 툴바 ── */}
      <div className="toolbar">
        <span className="count">{listings.length}건</span>
        <select
          value={filterStatus}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={e => handleFilterChange('source', e.target.value)}
          className="filter-select"
        >
          <option value="">전체 출처</option>
          {['네이버부동산', '공실클럽', '네이버블로그', '직접입력'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── 테이블 ── */}
      <div className="table-scroll">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>매물 로딩 중...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="empty-state">매물이 없습니다</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>주소 / 건물명</th>
                <th>면적</th>
                <th>보증금/월세</th>
                <th>상태</th>
                <th>출처</th>
                <th>AI점수</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const statusStyle = STATUS_COLORS[listing.status ?? '신규'] ?? STATUS_COLORS['신규']
                const isAnalyzing = analyzing === listing.airtableId
                return (
                  <tr
                    key={listing.id ?? listing.airtableId}
                    onClick={() => onSelect(listing)}
                    className="listing-row"
                  >
                    {/* 주소 */}
                    <td className="td-address">
                      <div className="address-main">{listing.address}</div>
                      {listing.buildingName && (
                        <div className="address-sub">{listing.buildingName} {listing.floor && `·${listing.floor}`}</div>
                      )}
                    </td>

                    {/* 면적 */}
                    <td className="td-area">
                      {listing.area ? `${listing.area}㎡` : '-'}
                    </td>

                    {/* 가격 */}
                    <td className="td-price">
                      {listing.deposit && (
                        <div className="price-deposit">보{listing.deposit.toLocaleString()}</div>
                      )}
                      {listing.monthlyRent && (
                        <div className="price-rent">월{listing.monthlyRent.toLocaleString()}</div>
                      )}
                      {!listing.deposit && !listing.monthlyRent && '-'}
                    </td>

                    {/* 상태 변경 */}
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        value={listing.status ?? '신규'}
                        onChange={e => handleStatusChange(listing, e.target.value)}
                        className="status-select"
                        style={{ background: statusStyle.bg, color: statusStyle.text }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* 출처 */}
                    <td>
                      <span
                        className="source-badge"
                        style={{ color: SOURCE_COLORS[listing.source ?? '직접입력'] ?? '#888' }}
                      >
                        {listing.source}
                      </span>
                    </td>

                    {/* AI 점수 */}
                    <td className="td-score">
                      {listing.aiScore ? (
                        <div className="score-badge" style={{
                          background: listing.aiScore >= 7 ? '#f0fdf4' : listing.aiScore >= 5 ? '#fef9ec' : '#fef0ed',
                          color:      listing.aiScore >= 7 ? '#16a34a' : listing.aiScore >= 5 ? '#d97706' : '#e8593c',
                        }}>
                          {listing.aiScore}/10
                        </div>
                      ) : (
                        <span className="score-empty">-</span>
                      )}
                    </td>

                    {/* 액션 */}
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        {listing.sourceUrl && (
                          <a
                            href={listing.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-link"
                            title="원문 보기"
                          >↗</a>
                        )}
                        <button
                          className="btn-analyze"
                          onClick={() => handleAnalyze(listing)}
                          disabled={isAnalyzing}
                          title="AI 분석"
                        >
                          {isAnalyzing ? '⏳' : '🤖'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .listings-wrap { display: flex; flex-direction: column; height: 100%; background: #fafaf7; }
        .toolbar {
          padding: 10px 16px; background: white;
          border-bottom: 1px solid #e0dfd8;
          display: flex; align-items: center; gap: 10px;
        }
        .count { font-size: 13px; font-weight: 700; color: #1a1a2e; margin-right: 4px; }
        .filter-select {
          font-size: 12px; padding: 5px 10px;
          border: 1px solid #e0dfd8; border-radius: 6px;
          background: white; color: #555; cursor: pointer;
        }
        .table-scroll { flex: 1; overflow-y: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f5f4f0; position: sticky; top: 0; z-index: 1; }
        th {
          font-size: 11px; font-weight: 600; color: #888;
          padding: 8px 12px; text-align: left;
          border-bottom: 1px solid #e0dfd8; white-space: nowrap;
        }
        .listing-row { cursor: pointer; border-bottom: 1px solid #f0efe8; }
        .listing-row:hover { background: #fefefe; }
        td { padding: 10px 12px; vertical-align: middle; }
        .td-address { max-width: 180px; }
        .address-main { font-size: 13px; font-weight: 500; color: #1a1a2e; }
        .address-sub  { font-size: 11px; color: #aaa; margin-top: 2px; }
        .td-area      { font-size: 12px; color: #555; white-space: nowrap; }
        .td-price     { white-space: nowrap; }
        .price-deposit { font-size: 11px; color: #888; }
        .price-rent    { font-size: 12px; font-weight: 600; color: #e8593c; }
        .status-select {
          font-size: 11px; padding: 3px 8px; border: none;
          border-radius: 12px; font-weight: 600; cursor: pointer;
          outline: none;
        }
        .source-badge { font-size: 11px; font-weight: 600; }
        .td-score { text-align: center; }
        .score-badge {
          display: inline-block; font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 10px;
        }
        .score-empty { color: #ccc; font-size: 12px; }
        .action-btns { display: flex; gap: 4px; align-items: center; }
        .btn-link {
          font-size: 14px; text-decoration: none; color: #888;
          padding: 2px 4px; border-radius: 4px;
        }
        .btn-link:hover { background: #f0efe8; }
        .btn-analyze {
          background: none; border: none; cursor: pointer;
          font-size: 14px; padding: 2px 4px; border-radius: 4px;
        }
        .btn-analyze:hover:not(:disabled) { background: #f0efe8; }
        .btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }
        .loading-state {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 60px; color: #aaa; font-size: 14px;
        }
        .spinner {
          width: 24px; height: 24px; border: 2px solid #e0dfd8;
          border-top-color: #e8593c; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 60px; color: #aaa; font-size: 14px; }
      `}</style>
    </div>
  )
}
