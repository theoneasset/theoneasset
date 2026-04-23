import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PriceChart from './PriceChart';
import { Layers } from 'lucide-react';

const NaverMap = ({ matches, selectedMatch }) => {
  const mapRef = useRef(null);
  const naverMap = useRef(null);
  const markers = useRef([]);
  const infoWindowRoot = useRef(null);
  const [isCadastral, setIsCadastral] = useState(true);
  const cadastralLayer = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      const mapOptions = {
        center: new window.naver.maps.LatLng(37.5665, 126.9780),
        zoom: 14,
        mapTypeControl: true,
      };
      naverMap.current = new window.naver.maps.Map(mapRef.current, mapOptions);
      
      // 지적편집도 레이어 생성
      cadastralLayer.current = new window.naver.maps.CadastralLayer();
      if (isCadastral) {
        cadastralLayer.current.setMap(naverMap.current);
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 지적편집도 토글
  const toggleCadastral = () => {
    if (!naverMap.current || !cadastralLayer.current) return;
    const nextState = !isCadastral;
    setIsCadastral(nextState);
    cadastralLayer.current.setMap(nextState ? naverMap.current : null);
  };

  useEffect(() => {
    if (!naverMap.current || !matches) return;

    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    matches.forEach(match => {
      if (match.matchRate < 90) return;

      window.naver.maps.Service.geocode({ query: match.주소 }, (status, response) => {
        if (status !== window.naver.maps.Service.Status.OK) return;

        const result = response.v2.addresses[0];
        const coords = new window.naver.maps.LatLng(result.y, result.x);

        const marker = new window.naver.maps.Marker({
          position: coords,
          map: naverMap.current,
          title: match.건물명,
          icon: {
            content: `<div class="naver-marker ${match.matchRate >= 95 ? 'premium' : ''}">
                        <span class="rate">${match.matchRate}%</span>
                      </div>`,
            anchor: new window.naver.maps.Point(20, 20)
          }
        });

        const contentContainer = document.createElement('div');
        contentContainer.className = 'naver-infowindow glass';
        
        const infowindow = new window.naver.maps.InfoWindow({
          content: contentContainer,
          borderWidth: 0,
          backgroundColor: 'transparent',
          disableAnchor: true,
          pixelOffset: new window.naver.maps.Point(0, -10)
        });

        window.naver.maps.Event.addListener(marker, 'click', () => {
          infowindow.open(naverMap.current, marker);
          
          if (infoWindowRoot.current) {
            infoWindowRoot.current.unmount();
          }
          
          infoWindowRoot.current = createRoot(contentContainer);
          infoWindowRoot.current.render(
            <div className="infowindow-inner">
              <div className="infowindow-header">
                <span className="rate-badge">{match.matchRate}% Match</span>
                <h3>{match.건물명}</h3>
              </div>
              <div className="infowindow-body">
                <p className="address">{match.주소}</p>
                <div className="building-specs">
                  <span>🏢 {match.rawExtracted?.연면적 || '정보 없음'}</span>
                  <span>🚗 {match.rawExtracted?.주차 || '정보 없음'}</span>
                  <span>🛗 {match.rawExtracted?.승강기 || '정보 없음'}</span>
                </div>
                
                <div className="tenant-status">
                  <h4>층별 입점 현황</h4>
                  <ul className="tenant-list">
                    {match.tenantInfo?.map((t, i) => (
                      <li key={i}><strong>{t.floor}:</strong> {t.name} ({t.type})</li>
                    )) || <li>수집된 현황 없음</li>}
                  </ul>
                </div>

                <div className="analysis-report">
                  <h4>Gemini 분석 리포트</h4>
                  <p>{match.analysisReport || "데이터 분석 중..."}</p>
                </div>

                <PriceChart address={match.주소} />
                
                <a href={match.link} target="_blank" rel="noopener noreferrer" className="btn-link">상세 보기</a>
              </div>
            </div>
          );
        });

        markers.current.push(marker);
      });
    });
  }, [matches]);

  useEffect(() => {
    if (!naverMap.current || !selectedMatch) return;

    window.naver.maps.Service.geocode({ query: selectedMatch.주소 }, (status, response) => {
      if (status === window.naver.maps.Service.Status.OK) {
        const result = response.v2.addresses[0];
        const coords = new window.naver.maps.LatLng(result.y, result.x);
        naverMap.current.setCenter(coords);
        naverMap.current.setZoom(18);
      }
    });
  }, [selectedMatch]);

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 지적편집도 토글 버튼 */}
      <button 
        onClick={toggleCadastral}
        className={`map-control-btn glass ${isCadastral ? 'active' : ''}`}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 15px',
          borderRadius: '10px',
          cursor: 'pointer',
          color: isCadastral ? 'var(--accent)' : 'white',
          border: isCadastral ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <Layers size={18} />
        <span>지적편집도 {isCadastral ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
};

export default NaverMap;
