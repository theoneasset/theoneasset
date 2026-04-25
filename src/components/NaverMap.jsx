import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search, AlertTriangle } from 'lucide-react';
import BuildingDetailView from './BuildingDetailView';

const NaverMap = ({ matches, selectedMatch, isScanning, onStartScan }) => {
  const nMap = useRef(null);
  const markers = useRef([]);
  const infoWindowRoot = useRef(null);
  const [isCadastral, setIsCadastral] = useState(true);
  const [status, setStatus] = useState('loading'); 
  const [isAuthFailed, setIsAuthFailed] = useState(false);

  const CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

  // [1] 지도 초기화 로직 (철저한 중복 방지)
  useEffect(() => {
    if (!CLIENT_ID) {
      setStatus('config_error');
      return;
    }

    let isMounted = true;

    const initMap = () => {
      if (!isMounted || !window.naver || !window.naver.maps) return;
      
      // 이미 지도가 존재하면 절대로 새로 만들지 않음
      if (nMap.current) {
        setStatus('ready');
        return;
      }

      const mapContainer = document.getElementById('naver-map-container');
      if (!mapContainer) return;

      try {
        const mapInstance = new window.naver.maps.Map('naver-map-container', {
          center: new window.naver.maps.LatLng(37.5015, 127.0346),
          zoom: 16,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.naver.maps.MapTypeControlStyle.BUTTON,
            position: window.naver.maps.Position.TOP_LEFT
          }
        });
        
        window.naver.maps.Event.once(mapInstance, 'init', () => {
          if (!isMounted) return;
          nMap.current = mapInstance;
          setStatus('ready');
          console.log('✅ [V3-MAP-READY] Map Instance Created Successfully');
        });

        window.naver.maps.Event.addListener(mapInstance, 'auth_failed', () => {
          if (!isMounted) return;
          setIsAuthFailed(true);
          setStatus('auth_failed');
        });

      } catch (err) {
        console.error('❌ [Map Init Error]', err);
        if (!isMounted) return;
        setStatus('error');
      }
    };

    const scriptId = 'naver-map-sdk-v3';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${CLIENT_ID}&submodules=geocoder`;
      script.async = true;
      script.onload = () => setTimeout(initMap, 500);
      document.head.appendChild(script);
    } else {
      setTimeout(initMap, 200);
    }

    return () => { isMounted = false; };
  }, [CLIENT_ID]);

  // [2] 마커 렌더링 로직 (try-catch로 분리하여 크래시 방지)
  useEffect(() => {
    if (!nMap.current || status !== 'ready' || isAuthFailed) return;

    const renderMarkers = () => {
      // [1] 지도 인스턴스 생존 확인
      if (!nMap.current || !window.naver || !window.naver.maps) return;

      try {
        // 기존 마커 안전하게 제거
        if (Array.isArray(markers.current)) {
          markers.current.forEach(m => { 
            try { if(m) m.setMap(null); } catch(e) {} 
          });
        }
        markers.current = [];

        if (!matches || !Array.isArray(matches)) return;

        matches.forEach(match => {
          // [2] 마커별 개별 격리 (하나가 터져도 지도는 살려야 함)
          try {
            // 필수 데이터 검증 및 널 체크
            if (!match || !match.lat || !match.lon) return;
            
            const lat = Number(match.lat);
            const lon = Number(match.lon);
            if (isNaN(lat) || isNaN(lon)) return;

            const matchRate = Number(match.matchRate || 0);
            if (matchRate < 90) return;

            // [3] 문자열 처리 전 널 체크 (capitalize 등 에러 방지)
            const safeAddress = match.주소 || '주소 정보 없음';
            const safeName = match.건물명 || '건물명 미상';
            const isPremium = !!match.isExclusive;

            const marker = new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(lat, lon),
              map: nMap.current,
              icon: {
                content: `
                  <div class="naver-marker ${isPremium ? 'premium' : ''}">
                    <div class="marker-body">
                      <span>${matchRate}%</span>
                    </div>
                  </div>
                `,
                anchor: new window.naver.maps.Point(20, 20)
              }
            });

            window.naver.maps.Event.addListener(marker, 'click', () => {
              try {
                const iw = new window.naver.maps.InfoWindow({
                  content: '<div id="iw-p-v11"></div>',
                  borderWidth: 0,
                  backgroundColor: "transparent",
                  disableAnchor: true
                });
                iw.open(nMap.current, marker);
                setTimeout(() => {
                  const el = document.getElementById('iw-p-v11');
                  if (el) {
                    if (infoWindowRoot.current) try { infoWindowRoot.current.unmount(); } catch(e) {}
                    infoWindowRoot.current = createRoot(el);
                    infoWindowRoot.current.render(<BuildingDetailView match={match} />);
                  }
                }, 100);
              } catch (iwErr) {
                console.warn('⚠️ InfoWindow Error:', iwErr);
              }
            });
            markers.current.push(marker);
          } catch (markerErr) {
            // 특정 마커 에러 시 해당 마커만 건너뜀
            console.warn('⚠️ [Marker Skipped] Data error in match:', markerErr);
          }
        });
      } catch (globalRenderErr) {
        console.error('❌ [Critical] Render markers failed but map is preserved:', globalRenderErr);
      }
    };

    const timer = setTimeout(renderMarkers, 500);
    return () => clearTimeout(timer);
  }, [matches, status, isAuthFailed]);

  const toggleCadastral = () => {
    if (nMap.current) {
      const next = !isCadastral;
      setIsCadastral(next);
      if (!nMap.current.cadLayer) {
        nMap.current.cadLayer = new window.naver.maps.CadastralLayer();
      }
      nMap.current.cadLayer.setMap(next ? nMap.current : null);
    }
  };

  if (status === 'config_error') {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b1120', color: 'white', padding: '40px', textAlign: 'center' }}>
        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '24px' }} />
        <h2>에어테이블 환경 변수 미설정 (Check Vercel Settings)</h2>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative', background: '#0b0f19' }}>
      <div id="naver-map-container" style={{ width: '100%', height: '100%', minHeight: '500px' }} />
      
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, background: '#0b1120' }}>
          <div className="loading-spinner"></div>
          <p style={{ color: 'white', marginTop: '24px' }}>MAP INITIALIZING...</p>
        </div>
      )}

      {isAuthFailed && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(11, 17, 32, 0.95)', color: 'white' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
          <h3>네이버 지도 인증 실패</h3>
        </div>
      )}

      {status === 'ready' && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={onStartScan} disabled={isScanning} className="glass action-btn" style={{ background: 'rgba(99, 102, 241, 0.5)', borderColor: 'rgba(165, 180, 252, 0.3)' }}>
            <Search size={18} />
            <span>수집 시작</span>
          </button>
          <button onClick={toggleCadastral} className={`glass action-btn ${isCadastral ? 'active' : ''}`}>
            <Layers size={18} />
            <span>지적편집도</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NaverMap;
