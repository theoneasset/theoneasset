import React, { useState, useEffect } from 'react';
import { airtableService } from '../api/airtable';
import { naverService } from '../api/naver';
import { geminiService } from '../api/gemini';
import PriceChart from './PriceChart';

const BuildingDetailView = ({ match }) => {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // 'parsing_failed' 등

  useEffect(() => {
    const fetchDeepInfo = async () => {
      setLoading(true);
      setErrorStatus(null);
      
      // 1. Airtable 캐시 확인 (7일 이내 유효 데이터)
      const cachedData = await airtableService.getBuildingCache(match.주소);
      if (cachedData) {
        setDetailData(cachedData);
        setLoading(false);
        return;
      }

      // 2. 캐시가 없거나 만료된 경우 실시간 수집 시도
      try {
        const detailHtml = await naverService.scrapeFullContent(match.주소);
        const deepInfo = await geminiService.analyzeDeepBuildingInfo(detailHtml, match);
        
        await airtableService.saveBuildingCache(match.주소, deepInfo);
        setDetailData(deepInfo);
      } catch (error) {
        console.warn('[Safe-Fall] 실시간 수집 실패, 만료된 캐시라도 불러옵니다.');
        setErrorStatus('parsing_failed');
        
        // 3. [Safe-Fall] 수집 실패 시 만료 여부 상관없이 캐시 강제 로드
        const fallbackData = await airtableService.getBuildingCache(match.주소, true);
        if (fallbackData) {
          setDetailData(fallbackData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDeepInfo();
  }, [match.주소]);

  if (loading) {
    return (
      <div className="infowindow-inner">
        <div className="infowindow-header">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        </div>
        <div className="infowindow-body">
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          <div className="tenant-status">
            <h4 style={{ color: 'var(--accent)' }}>입점 현황 분석 중...</h4>
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
          </div>
          <div className="skeleton skeleton-chart" />
        </div>
      </div>
    );
  }

  return (
    <div className="infowindow-inner">
      <div className="infowindow-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span className="rate-badge">{match.matchRate}% Match</span>
          {errorStatus === 'parsing_failed' && (
            <span style={{ fontSize: '0.65rem', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
              ⚠️ 실시간 데이터 로딩 지연 (캐시됨)
            </span>
          )}
        </div>
        <h3>{match.건물명}</h3>
      </div>
      <div className="infowindow-body">
        {!detailData && !loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            데이터를 불러올 수 없습니다. 다시 시도해주세요.
          </div>
        ) : (
          <>
            <p className="address">{match.주소}</p>
            <div className="building-specs">
              <span>🏢 {detailData?.specs?.연면적 || '정보 없음'}</span>
              <span>🚗 {detailData?.specs?.주차 || '정보 없음'}</span>
              <span>🛗 {detailData?.specs?.승강기 || '정보 없음'}</span>
            </div>
            
            <div className="tenant-status">
              <h4>층별 입점 현황</h4>
              <ul className="tenant-list">
                {detailData?.tenantList?.map((t, i) => (
                  <li key={i}><strong>{t.floor}:</strong> {t.name} ({t.type})</li>
                )) || <li>수집된 현황 없음</li>}
              </ul>
            </div>

            <div className="analysis-report">
              <h4>Gemini 분석 리포트</h4>
              <p>{detailData?.analysisReport || "매칭 데이터 분석 중..."}</p>
            </div>

            <PriceChart address={match.주소} />
          </>
        )}
        
        <a href={match.link} target="_blank" rel="noopener noreferrer" className="btn-link">상세 보기</a>
      </div>
    </div>
  );
};

export default BuildingDetailView;
