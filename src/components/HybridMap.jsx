import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search } from 'lucide-react';
import BuildingDetailView from './BuildingDetailView';

const HybridMap = ({ matches, selectedMatch, isScanning, onStartScan }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const vworldWmsLayer = useRef(null);
  const [isCadastral, setIsCadastral] = useState(true);

  useEffect(() => {
    if (!window.L) return;

    // 지도 초기화 (역삼동 성지하이츠 인근)
    leafletMap.current = window.L.map(mapRef.current).setView([37.5028, 127.0374], 18);

    // 기본 배경 지도 (OpenStreetMap)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMap.current);

    // 브이월드 WMS 레이어 추가 (지적도, 주거지역, 상업지역)
    const apiKey = import.meta.env.VITE_VWORLD_KEY;
    vworldWmsLayer.current = window.L.tileLayer.wms('https://api.vworld.kr/req/wms', {
      layers: 'LP_PA_CBND_BUBUN,LT_C_UQ111,LT_C_UQ112',
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      key: apiKey,
      domain: window.location.hostname,
      opacity: 0.6,
      styles: 'LP_PA_CBND_BUBUN,LT_C_UQ111,LT_C_UQ112'
    });

    if (isCadastral) {
      vworldWmsLayer.current.addTo(leafletMap.current);
    }

    // 마커 레이어 그룹
    markersLayer.current = window.L.layerGroup().addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
      }
    };
  }, []);

  // 지적도 토글
  const toggleCadastral = () => {
    if (!leafletMap.current || !vworldWmsLayer.current) return;
    const nextState = !isCadastral;
    setIsCadastral(nextState);
    
    if (nextState) {
      vworldWmsLayer.current.addTo(leafletMap.current);
    } else {
      leafletMap.current.removeLayer(vworldWmsLayer.current);
    }
  };

  // 매물 마커 업데이트
  useEffect(() => {
    if (!leafletMap.current || !matches || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    matches.forEach(match => {
      if (match.matchRate < 90) return;

      // 브이월드 지오코더를 사용하여 주소를 좌표로 변환
      const apiKey = import.meta.env.VITE_VWORLD_KEY;
      const geocodeUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(match.주소)}&refine=true&simple=false&format=json&type=parcel&key=${apiKey}`;

      fetch(geocodeUrl)
        .then(res => res.json())
        .then(data => {
          if (data.response?.status === 'OK') {
            const lat = parseFloat(data.response.result.point.y);
            const lon = parseFloat(data.response.result.point.x);

            const marker = window.L.marker([lat, lon]).addTo(markersLayer.current);
            
            const popupContent = document.createElement('div');
            popupContent.className = 'naver-infowindow glass';
            
            marker.on('click', () => {
              const root = createRoot(popupContent);
              root.render(<BuildingDetailView match={match} />);
              marker.bindPopup(popupContent, { minWidth: 300 }).openPopup();
            });
          }
        });
    });
  }, [matches]);

  // 선택된 매물로 이동
  useEffect(() => {
    if (!leafletMap.current || !selectedMatch) return;
    
    const apiKey = import.meta.env.VITE_VWORLD_KEY;
    const geocodeUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(selectedMatch.주소)}&refine=true&simple=false&format=json&type=parcel&key=${apiKey}`;

    fetch(geocodeUrl)
      .then(res => res.json())
      .then(data => {
        if (data.response?.status === 'OK') {
          const lat = parseFloat(data.response.result.point.y);
          const lon = parseFloat(data.response.result.point.x);
          leafletMap.current.setView([lat, lon], 19);
        }
      });
  }, [selectedMatch]);

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', backgroundColor: '#111' }} />
      
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '12px'
      }}>
        <button 
          onClick={onStartScan}
          disabled={isScanning}
          className="glass"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem',
            border: '1px solid var(--primary)',
            background: isScanning ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.6)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          <Search size={16} className={isScanning ? 'animate-spin' : ''} />
          <span>{isScanning ? '스캐닝 중...' : '지금 수집 시작'}</span>
        </button>

        <button 
          onClick={toggleCadastral}
          className={`map-control-btn glass ${isCadastral ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            color: isCadastral ? 'var(--accent)' : 'white',
            border: isCadastral ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(30, 41, 59, 0.5)'
          }}
        >
          <Layers size={16} />
          <span>브이월드 지적도 {isCadastral ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      
      {isCadastral && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '30px',
          right: '30px',
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: '16px',
          fontSize: '0.8rem',
          display: 'flex',
          gap: '20px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', background: '#FF0000', opacity: 0.7, borderRadius: '4px' }}></div>
            <span style={{ fontWeight: '700', color: '#fca5a5' }}>상업지역</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', background: '#FFFF00', opacity: 0.7, borderRadius: '4px' }}></div>
            <span style={{ fontWeight: '700', color: '#fef08a' }}>주거지역</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HybridMap;
