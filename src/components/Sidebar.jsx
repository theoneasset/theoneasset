import React from 'react';
import { Target, CheckCircle, AlertCircle, ExternalLink, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ matches, onSelectMatch, isScanning }) => {
  return (
    <div className="sidebar glass">
      <div className="sidebar-header">
        <h1>THE ONE ASSET</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Intelligence Tracker v1.0</p>
        
        <div className="status-indicator">
          <div className={`dot ${isScanning ? 'active' : ''}`} />
          <span>{isScanning ? '매물 스캐닝 중...' : '시스템 대기 중'}</span>
        </div>
      </div>

      <div className="sidebar-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Target size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem' }}>오늘의 90% 이상 매칭 리스트</h3>
        </div>

        <AnimatePresence>
          {matches.map((match, index) => (
            <motion.div
              key={match.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="match-card glass"
              onClick={() => onSelectMatch(match)}
            >
              <div className="match-header">
                <span className={`match-rate ${match.matchRate >= 90 ? 'high' : ''}`}>
                  {match.matchRate}% Match
                </span>
                {match.matchRate >= 90 ? (
                  <span className="badge badge-confirmed">확정 매물</span>
                ) : (
                  <span className="badge badge-review">검토 필요</span>
                )}
              </div>
              
              <div className="address">
                <MapPin size={14} style={{ marginRight: '4px', display: 'inline' }} />
                {match.주소}
              </div>
              
              <div className="details">
                <span>{match.건물명}</span>
                <span>•</span>
                <span>{match.전용면적}m²</span>
                <span>•</span>
                <span>{match.가격}만원</span>
              </div>

              {match.summary && (
                <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  "{match.summary}"
                </p>
              )}

              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <a 
                  href={match.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  원문 보기 <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {matches.length === 0 && !isScanning && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>검색된 매물이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
