import React, { useState, useEffect } from 'react';
import { airtableService } from '../api/airtable';
import { naverService } from '../api/naver';
import { geminiService } from '../api/gemini';
import PriceChart from './PriceChart';

const BuildingDetailView = ({ match }) => {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeepInfo = async () => {
      setLoading(true);
      
      // 1. Airtable 캐시 확인
      const cachedData = await airtableService.getBuildingCache(match.주소);
      if (cachedData) {
        console.log('[Cache] 캐시된 데이터를 불러옵니다:', match.주소);
        setDetailData(cachedData);
        setLoading(false);
        return;
      }

      // 2. 캐시가 없으면 온디맨드 수집 및 분석
      console.log('[On-Demand] 실시간 수집을 시작합니다:', match.주소);
      try {
        const detailHtml = await naverService.scrapeFullContent(match.주소);
        const deepInfo = await geminiService.analyzeDeepBuildingInfo(detailHtml, match);
        
        // Airtable에 캐시 저장
        await airtableService.saveBuildingCache(match.주소, deepInfo);
        
        setDetailData(deepInfo);
      } catch (error) {
        console.error('On-Demand Loading Error:', error);
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
        <span className="rate-badge">{match.matchRate}% Match</span>
        <h3>{match.건물명}</h3>
      </div>
      <div className="infowindow-body">
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
        
        <a href={match.link} target="_blank" rel="noopener noreferrer" className="btn-link">상세 보기</a>
      </div>
    </div>
  );
};

export default BuildingDetailView;
