import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search } from 'lucide-react';
import BuildingDetailView from './BuildingDetailView';
import { GANGNAM_DONGS } from '../data/gangnamDongs';
import { GANGNAM_BOUNDARIES } from '../data/gangnamBoundaries';

const HybridMap = ({ matches, selectedMatch, isScanning, onStartScan, filters }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const vworldWmsLayer = useRef(null);
  const searchMarkerLayer = useRef(null);
  const dongOverlayLayer = useRef(null); // 구역 하이라이트용 레이어
  const markerRefs = useRef({}); 
  
  const [isCadastral, setIsCadastral] = useState(true);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (!window.L) return;

    // 지도 초기화
    leafletMap.current = window.L.map(mapRef.current, {
      zoomControl: true,
      preferCanvas: true,
      zoomSnap: 0.1,
      zoomDelta: 0.5
    }).setView([37.4999, 127.0374], 13);

    leafletMap.current.on('zoomend', () => {
      setZoom(leafletMap.current.getZoom());
    });

    // 배경 지도
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(leafletMap.current);

    // 브이월드 WMS (지적도) - 환경 변수 사용
        const apiKey = import.meta.env.VITE_MY_VWORLD_KEY;
    if (apiKey) {
      vworldWmsLayer.current = window.L.tileLayer.wms('https://api.vworld.kr/req/wms', {
        layers: 'LP_PA_CBND_BUBUN,LT_C_UQ111,LT_C_UQ112',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        key: apiKey,
        opacity: 0.6
      });

      if (isCadastral) vworldWmsLayer.current.addTo(leafletMap.current);
    }

    // 레이어 그룹 설정
    markersLayer.current = window.L.layerGroup().addTo(leafletMap.current);
    searchMarkerLayer.current = window.L.layerGroup().addTo(leafletMap.current);
    dongOverlayLayer.current = window.L.layerGroup().addTo(leafletMap.current);

    // 본사 마커
    window.L.marker([37.5034, 127.0372], {
      icon: window.L.divIcon({
        className: 'office-marker-container',
        html: `<div class="office-label">더원에셋 중개법인</div><div class="pulsating-dot"></div>`,
        iconSize: [0, 0]
      })
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) leafletMap.current.remove();
    };
  }, []);

  // [중요] 다중 법정동 선택 시 '앵글 고정' 및 '구역 하이라이트'
  useEffect(() => {
    if (!leafletMap.current || !filters || !filters.selectedDongs || !dongOverlayLayer.current) return;
    
    // 기존 하이라이트 모두 제거
    dongOverlayLayer.current.clearLayers();

    // 선택된 각 동네에 대해 폴리곤(영역) 그리기
    filters.selectedDongs.forEach(dongName => {
      const boundary = GANGNAM_BOUNDARIES[dongName];
      if (boundary) {
        window.L.polygon(boundary.coords, {
          color: boundary.color,
          weight: 2,
          opacity: 0.8,
          fillColor: boundary.color,
          fillOpacity: 0.25, // 반투명 컬러
          dashArray: '5, 10',
          interactive: false // 마우스 클릭 방해 금지
        }).addTo(dongOverlayLayer.current);
      }
    });

    // 앵글은 이동하지 않고 고정됨 (flyTo 제거됨)
  }, [filters.selectedDongs]);

  // 부드러운 지도 이동 함수 (매물 상세 클릭 등 명시적 액션에만 사용)
  const smoothFlyTo = (coords, zoomLevel = 15) => {
    if (!leafletMap.current) return;
    const currentCenter = leafletMap.current.getCenter();
    const distance = currentCenter.distanceTo(window.L.latLng(coords));
    const duration = distance > 2000 ? 2.2 : 1.5;

    leafletMap.current.flyTo(coords, zoomLevel, {
      duration: duration,
      easeLinearity: 0.1,
      noMoveStart: true
    });
  };

  // 마커 생성 및 업데이트
  const createMarker = (match, lat, lon) => {
    if (!markersLayer.current) return;
    const marker = window.L.marker([lat, lon]).addTo(markersLayer.current);
    const matchId = match.id || match.주소;
    markerRefs.current[matchId] = marker;
    const popupContent = document.createElement('div');
    popupContent.className = 'naver-infowindow glass';
    const renderPopup = () => {
      const root = createRoot(popupContent);
      root.render(<BuildingDetailView match={match} />);
      marker.bindPopup(popupContent, { minWidth: 300, className: 'custom-popup' }).openPopup();
    };
    marker.on('click', renderPopup);
    return marker;
  };

  useEffect(() => {
    if (!leafletMap.current || !matches || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    markerRefs.current = {}; 
    matches.forEach(match => {
      if (match.matchRate < 90) return;
      if (match.lat && match.lon) {
        createMarker(match, match.lat, match.lon);
      } else {
        const apiKey = import.meta.env.VITE_VWORLD_KEY;
        if (!apiKey) return;

        const domain = window.location.origin;
        const geocodeUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(match.주소)}&refine=true&simple=false&format=json&type=parcel&key=${apiKey}&domain=${domain}`;
        fetch(geocodeUrl).then(res => res.json()).then(data => {
          if (data.response?.status === 'OK') {
            const lat = parseFloat(data.response.result.point.y);
            const lon = parseFloat(data.response.result.point.x);
            createMarker(match, lat, lon);
          }
        }).catch(err => console.error(err));
      }
    });
  }, [matches]);

  // 리스트 매물 클릭 시에만 부드러운 이동 실행
  useEffect(() => {
    if (!leafletMap.current || !selectedMatch) return;
    const matchId = selectedMatch.id || selectedMatch.주소;
    const tryOpenPopup = (retryCount = 0) => {
      const existingMarker = markerRefs.current[matchId];
      if (existingMarker) {
        smoothFlyTo(existingMarker.getLatLng(), 19);
        setTimeout(() => existingMarker.fire('click'), 1800);
      } else if (retryCount < 5) {
        setTimeout(() => tryOpenPopup(retryCount + 1), 500);
      }
    };
    tryOpenPopup();
  }, [selectedMatch]);

  const toggleCadastral = () => {
    if (!leafletMap.current || !vworldWmsLayer.current) return;
    const nextState = !isCadastral;
    setIsCadastral(nextState);
    if (nextState) vworldWmsLayer.current.addTo(leafletMap.current);
    else leafletMap.current.removeLayer(vworldWmsLayer.current);
  };

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', backgroundColor: '#111' }} />
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '12px' }}>
        <button onClick={onStartScan} disabled={isScanning} className="glass scan-btn">
          <Search size={16} className={isScanning ? 'animate-spin' : ''} />
          <span>{isScanning ? '스캐닝 중...' : '지금 수집 시작'}</span>
        </button>
        <button onClick={toggleCadastral} className={`map-control-btn glass ${isCadastral ? 'active' : ''}`}>
          <Layers size={16} />
          <span>브이월드 지적도 {isCadastral ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      {isCadastral && (
        <div className="glass map-legend">
          <div className="legend-item"><div className="legend-color commercial"></div><span>상업지역</span></div>
          <div className="legend-item"><div className="legend-color residential"></div><span>주거지역</span></div>
        </div>
      )}
    </div>
  );
};

export default HybridMap;
