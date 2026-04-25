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
        
        // Airtable에 캐시 저장 및 마스터 DB 동기화
        await airtableService.saveBuildingCache(match.주소, deepInfo);
        await airtableService.syncBuildingToMaster(match.주소, {
          ...deepInfo.specs,
          건물명: match.건물명
        });
        
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
          <div className="skeleton skeleton-title" style={{ width: '80%' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: '600', animation: 'pulse 1.5s infinite' }}>
            더원에셋 AI가 정밀 분석 중입니다...
          </p>
        </div>
        <div className="infowindow-body">
          <div className="skeleton skeleton-text" style={{ height: '14px' }} />
          <div className="skeleton skeleton-text" style={{ width: '90%' }} />
          <div className="tenant-status" style={{ marginTop: '20px' }}>
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '16px' }} />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
          </div>
          <div className="skeleton skeleton-chart" style={{ borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="infowindow-inner">
      <div className="infowindow-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span className="rate-badge">{match?.matchRate || 0}% Match</span>
          {errorStatus === 'parsing_failed' && (
            <span style={{ fontSize: '0.65rem', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
              ⚠️ 실시간 데이터 로딩 지연 (캐시됨)
            </span>
          )}
        </div>
        <h3>{match?.건물명 || '건물명 미상'}</h3>
      </div>
      <div className="infowindow-body">
        {!detailData && !loading ? (
          <div className="demo-content">
            <p className="address">{match?.주소 || '주소 정보 없음'}</p>
            <div className="building-specs">
              <span>🏢 연면적 3,450m²</span>
              <span>🚗 주차 45대</span>
              <span>🛗 승강기 2대</span>
            </div>
            
            <div className="tenant-status">
              <h4>층별 입점 현황 (샘플)</h4>
              <ul className="tenant-list">
                <li><strong>1F:</strong> 스타벅스 (카페/음식점)</li>
                <li><strong>2F:</strong> 더원에셋 의원 (병원)</li>
                <li><strong>3F:</strong> 공실 (입점 가능)</li>
              </ul>
            </div>

            <div className="analysis-report">
              <h4>Gemini 분석 리포트 (샘플)</h4>
              <p>해당 매물은 대로변 코너에 위치하여 가시성이 매우 뛰어납니다. 3층 공실은 현재 주변 시세 대비 10% 저렴하게 나와 있어 병원 또는 학원 업종을 강력 추천합니다.</p>
            </div>

            <PriceChart address={match?.주소 || ''} />
          </div>
        ) : (
          <>
            <p className="address">{match?.주소 || '주소 정보 없음'}</p>
            <div className="building-specs">
              <span>🏢 {detailData?.specs?.연면적 || '정보 없음'}</span>
              <span>🚗 {detailData?.specs?.주차 || '정보 없음'}</span>
              <span>🛗 {detailData?.specs?.승강기 || '정보 없음'}</span>
            </div>
            
            <div className="tenant-status">
              <h4>층별 입점 현황</h4>
              <ul className="tenant-list">
                {(detailData?.tenantList && Array.isArray(detailData.tenantList)) ? detailData.tenantList.map((t, i) => (
                  <li key={i}><strong>{t?.floor || '층 미상'}:</strong> {t?.name || '정보 없음'} ({t?.type || '입점사'})</li>
                )) : <li>수집된 현황 없음</li>}
              </ul>
            </div>

            <div className="analysis-report">
              <h4>Gemini 분석 리포트</h4>
              <p>{detailData?.analysisReport || match?.summary || "매칭 데이터 분석 중..."}</p>
            </div>

            <PriceChart address={match?.주소 || ''} />
          </>
        )}
        
        <a href={match?.link || '#'} target="_blank" rel="noopener noreferrer" className="btn-link">상세 보기</a>
      </div>
    </div>
  );
};

export default BuildingDetailView;
