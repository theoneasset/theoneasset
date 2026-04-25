import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  ListFilter, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ChevronRight, 
  Building2, 
  ArrowUpRight,
  Search,
  LayoutDashboard,
  Map as MapIcon
} from 'lucide-react';

const AdminDashboard = ({ matches }) => {
  const [filter, setFilter] = useState('all'); // all, high, medium, low
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 통계 데이터 계산
  const stats = useMemo(() => {
    if (!matches) return { total: 0, high: 0, medium: 0, low: 0 };
    return {
      total: matches.length,
      high: matches.filter(m => (m.matchRate || 0) >= 90).length,
      medium: matches.filter(m => (m.matchRate || 0) >= 70 && (m.matchRate || 0) < 90).length,
      low: matches.filter(m => (m.matchRate || 0) < 70).length,
    };
  }, [matches]);

  // 2. 필터링 및 검색 로직
  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    return matches.filter(m => {
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'high' ? (m.matchRate || 0) >= 90 :
        filter === 'medium' ? (m.matchRate || 0) >= 70 && (m.matchRate || 0) < 90 :
        (m.matchRate || 0) < 70;
      
      const matchesSearch = 
        (m.건물명 || '').includes(searchQuery) || 
        (m.주소 || '').includes(searchQuery);
      
      return matchesFilter && matchesSearch;
    });
  }, [matches, filter, searchQuery]);

  return (
    <div className="admin-dashboard animate-in">
      <div className="dashboard-header">
        <div className="title-area">
          <h2><LayoutDashboard size={24} className="icon-accent" /> Intelligence Insight</h2>
          <p>오늘 수집된 {stats.total}개의 매물을 AI가 정밀 분석했습니다.</p>
        </div>
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="건물명 또는 주소 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 1. 통계 카드 섹션 */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilter('all')}>
          <div className="stat-info">
            <span className="label">전체 수집</span>
            <span className="value">{stats.total}</span>
          </div>
          <BarChart3 className="stat-icon" />
        </div>
        <div className="stat-card high" onClick={() => setFilter('high')}>
          <div className="stat-info">
            <span className="label">완전 매칭 (90%+)</span>
            <span className="value">{stats.high}</span>
          </div>
          <CheckCircle2 className="stat-icon" />
        </div>
        <div className="stat-card medium" onClick={() => setFilter('medium')}>
          <div className="stat-info">
            <span className="label">유력 후보 (70-89%)</span>
            <span className="value">{stats.medium}</span>
          </div>
          <AlertCircle className="stat-icon" />
        </div>
        <div className="stat-card low" onClick={() => setFilter('low')}>
          <div className="stat-info">
            <span className="label">검토 필요</span>
            <span className="value">{stats.low}</span>
          </div>
          <ListFilter className="stat-icon" />
        </div>
      </div>

      {/* 2. 매칭 분석 테이블 */}
      <div className="data-section">
        <div className="section-header">
          <h3>분석 리포트 목록</h3>
          <div className="badge-group">
            <span className={`badge ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>전체</span>
            <span className={`badge high ${filter === 'high' ? 'active' : ''}`} onClick={() => setFilter('high')}>확정적</span>
            <span className={`badge medium ${filter === 'medium' ? 'active' : ''}`} onClick={() => setFilter('medium')}>추론됨</span>
          </div>
        </div>

        <div className="table-container">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>건물 정보</th>
                <th>매칭률</th>
                <th>AI 분석 요약</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.length > 0 ? (filteredMatches.map((match, idx) => (
                <tr key={idx} className="table-row animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <td className="col-building">
                    <div className="building-cell">
                      <div className="building-icon"><Building2 size={16} /></div>
                      <div>
                        <div className="name">{match.건물명 || '건물명 미상'}</div>
                        <div className="addr">{match.주소 || '주소 정보 없음'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="col-rate">
                    <div className={`rate-pill ${(match.matchRate || 0) >= 90 ? 'high' : (match.matchRate || 0) >= 70 ? 'medium' : 'low'}`}>
                      {match.matchRate || 0}%
                    </div>
                  </td>
                  <td className="col-report">
                    <p className="report-text">{match.analysisReport || "매칭 데이터 분석 결과 주소지와 건물 제원이 일치합니다."}</p>
                  </td>
                  <td>
                    <span className="status-tag">{(match.matchRate || 0) >= 90 ? '검증완료' : '검토중'}</span>
                  </td>
                  <td>
                    <div className="action-group">
                      <a href={match.link} target="_blank" rel="noreferrer" className="icon-btn"><ExternalLink size={16} /></a>
                      <button className="icon-btn accent"><ArrowUpRight size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))) : (
                <tr>
                  <td colSpan="5" className="empty-state">
                    오늘 수집된 조건에 맞는 매물이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard {
          padding: 30px;
          height: 100%;
          overflow-y: auto;
          background: #0f172a;
          color: white;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .title-area h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .icon-accent { color: var(--accent); }
        .title-area p { color: #94a3b8; font-size: 0.95rem; }

        .search-box {
          display: flex;
          align-items: center;
          background: #1e293b;
          padding: 10px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.05);
          width: 320px;
        }
        .search-box input {
          background: transparent;
          border: none;
          color: white;
          margin-left: 10px;
          width: 100%;
          outline: none;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: #1e293b;
          padding: 24px;
          border-radius: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          background: #334155;
          border-color: var(--accent);
        }
        .stat-info .label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 8px; }
        .stat-info .value { font-size: 2rem; font-weight: 800; }
        .stat-icon { opacity: 0.2; width: 40px; height: 40px; }

        .stat-card.high .value { color: #34d399; }
        .stat-card.medium .value { color: #fbbf24; }
        .stat-card.low .value { color: #f87171; }

        .data-section {
          background: #1e293b;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .badge-group { display: flex; gap: 8px; }
        .badge {
          padding: 6px 14px;
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .badge.active { background: var(--accent); color: white; }

        .table-container { overflow-x: auto; }
        .analysis-table { width: 100%; border-collapse: collapse; }
        .analysis-table th { text-align: left; padding: 16px; color: #64748b; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .analysis-table td { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.02); }
        
        .building-cell { display: flex; align-items: center; gap: 14px; }
        .building-icon { width: 36px; height: 36px; background: rgba(99, 102, 241, 0.1); border-radius: 10px; display: flex; align-items: center; justifyContent: center; color: var(--accent); }
        .building-cell .name { font-weight: 700; margin-bottom: 4px; }
        .building-cell .addr { font-size: 0.8rem; color: #64748b; }

        .rate-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 0.85rem;
        }
        .rate-pill.high { background: rgba(52, 211, 153, 0.1); color: #34d399; }
        .rate-pill.medium { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
        .rate-pill.low { background: rgba(248, 113, 113, 0.1); color: #f87171; }

        .report-text {
          font-size: 0.85rem;
          color: #cbd5e1;
          max-width: 400px;
          line-height: 1.5;
        }

        .status-tag {
          font-size: 0.75rem;
          color: #64748b;
          background: rgba(255,255,255,0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .action-group { display: flex; gap: 10px; }
        .icon-btn {
          width: 34px;
          height: 34px;
          background: rgba(255,255,255,0.05);
          border: none;
          border-radius: 10px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .icon-btn.accent { color: var(--accent); }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.4s ease forwards; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
