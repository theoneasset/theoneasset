import React, { useState } from 'react';
import { Target, CheckCircle, AlertCircle, MapPin, Database, PlusSquare, Search, Send, Loader2, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../api/gemini';

// 강남구 법정동 마스터 리스트 (정확한 명칭 고정)
const GANGNAM_DONGS = [
  '신사동', '압구정동', '논현동', '역삼동', '도곡동',
  '청담동', '삼성동', '대치동', '개포동', '일원동',
  '수서동', '세곡동'
];

const formatWithCommas = (value) => {
  if (!value && value !== 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNumber = (value) => {
  return Number(value.replace(/,/g, '')) || 0;
};

const Sidebar = ({ matches, filters, setFilters, onSelectMatch, isScanning, onInjectTest }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState(null);

  const toggleDong = (dong) => {
    const isSelected = filters.selectedDongs.includes(dong);
    const newDongs = isSelected 
      ? filters.selectedDongs.filter(d => d !== dong)
      : [...filters.selectedDongs, dong];
    setFilters({ ...filters, selectedDongs: newDongs });
  };

  const handleAIAnalysis = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    try {
      const info = await geminiService.extractBuildingInfo(rawText);
      setExtractedInfo(info);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFilterChange = (field, value) => {
    const numValue = parseNumber(value);
    setFilters({ ...filters, [field]: numValue });
  };

  // 버튼 텍스트 처리 (압구정만 '동' 제외, 나머지는 정확한 명칭 출력)
  const getButtonLabel = (dong) => {
    return dong;
  };

  return (
    <div className="sidebar glass">
      <div className="sidebar-header">
        <h1 style={{ letterSpacing: '-1.5px' }}>THE ONE ASSET</h1>
        <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
          <button onClick={() => setActiveTab('list')} className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}>실시간 추적</button>
          <button onClick={() => setActiveTab('admin')} className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}>매물 등록(Admin)</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' ? (
          <motion.div key="list-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="sidebar-filters glass" style={{ margin: '0 16px 20px', padding: '16px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                <MapIcon size={16} /> 지역 카테고리
              </h3>
              
              <div style={{ 
                background: 'rgba(15, 23, 42, 0.4)', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '12px', 
                padding: '10px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {GANGNAM_DONGS.map(dong => (
                    <button
                      key={dong}
                      onClick={() => toggleDong(dong)}
                      className="dong-btn"
                      translate="no"
                      style={{
                        padding: '6px 2px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        border: filters.selectedDongs.includes(dong) 
                          ? '1px solid var(--accent)' 
                          : '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: filters.selectedDongs.includes(dong) 
                          ? 'var(--accent)' 
                          : 'rgba(255,255,255,0.08)',
                        color: filters.selectedDongs.includes(dong) 
                          ? '#0f172a' 
                          : 'rgba(255,255,255,0.6)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {getButtonLabel(dong)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="input-group">
                    <label translate="no">최소 보증금</label>
                    <input type="text" className="filter-input" placeholder="0원" value={formatWithCommas(filters.minDeposit)} onChange={(e) => handleFilterChange('minDeposit', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label translate="no">최대 보증금</label>
                    <input type="text" className="filter-input" placeholder="무제한" value={formatWithCommas(filters.maxDeposit)} onChange={(e) => handleFilterChange('maxDeposit', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="input-group">
                    <label translate="no">최소 월세</label>
                    <input type="text" className="filter-input" placeholder="0원" value={formatWithCommas(filters.minRent)} onChange={(e) => handleFilterChange('minRent', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label translate="no">최대 월세</label>
                    <input type="text" className="filter-input" placeholder="무제한" value={formatWithCommas(filters.maxRent)} onChange={(e) => handleFilterChange('maxRent', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} color="#34d399" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>추적 리스트 ({matches.length})</h3>
                </div>
                <button onClick={onInjectTest} className="sample-btn">샘플 로드</button>
              </div>

              <div className="scroll-area" style={{ height: 'calc(100vh - 520px)', overflowY: 'auto' }}>
                {matches.map((match, index) => (
                  <div key={match.id || index} className="match-card glass" onClick={() => onSelectMatch(match)}>
                    <div className="match-header">
                      <span className={`match-rate ${match.matchRate >= 90 ? 'high' : ''}`}>{match.matchRate}% Match</span>
                      {match.isExclusive && <span className="exclusive-badge">EXCLUSIVE</span>}
                    </div>
                    <div className="address">
                      <MapPin size={12} className="icon" />
                      {match.주소}
                    </div>
                    <div className="details">
                      <span className="price-bold">보 {(match.보증금 || match.가격)?.toLocaleString()}원</span>
                      <span className="rent-bold">/ 월 {(match.월세 || 0).toLocaleString()}원</span>
                      <span className="divider">|</span>
                      <span>{match.전용면적}m²</span>
                    </div>
                  </div>
                ))}
                {matches.length === 0 && <div style={{ textAlign: 'center', marginTop: '60px' }}><p style={{ color: 'var(--text-muted)' }}>매물이 없습니다.</p></div>}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="admin-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} style={{ padding: '0 16px' }}>
            <div className="glass admin-container">
              <h3><PlusSquare size={20} color="var(--accent)" /> AI 빠른 매물 등록</h3>
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="복사한 내용을 붙여넣으세요..." />
              <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="ai-btn">
                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} AI 분석
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
