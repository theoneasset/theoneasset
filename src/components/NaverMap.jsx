import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search, AlertTriangle, RefreshCw, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import BuildingDetailView from './BuildingDetailView';

// 네이버 지도 SDK 최신 버전(v3) 고정
const MAP_VERSION = "3";

const NaverMap = ({ matches, selectedMatch, isScanning, onStartScan }) => {
  const mapRef = useRef(null);
  const nMap = useRef(null);
  const markers = useRef([]);
  const infoWindowRoot = useRef(null);
  const [isCadastral, setIsCadastral] = useState(true);
  const [status, setStatus] = useState('loading'); 
  const [isAuthFailed, setIsAuthFailed] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  // 환경 변수 로드
  const CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
  
  useEffect(() => {
    // 디버그 로그: 클라이언트 ID 확인
    console.log(`[DEBUG] Current Client ID in Code: ${CLIENT_ID}`);

    if (!CLIENT_ID) {
      console.error("[CRITICAL] VITE_NAVER_MAP_CLIENT_ID is missing!");
      setStatus('config_error');
      return;
    }

    let isMounted = true;

    const initMap = () => {
      if (!isMounted || !window.naver || !window.naver.maps) return;
      if (nMap.current) return;

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
          console.log("[NaverMap] SUCCESS: Map fully initialized");
          nMap.current = mapInstance;
          setStatus('ready');
          setTimeout(() => { if (mapInstance) mapInstance.refresh(); }, 500);
        });

        window.naver.maps.Event.addListener(mapInstance, 'auth_failed', () => {
          if (!isMounted) return;
          console.error("[NaverMap] Auth Failed. Check NCP Console settings.");
          setIsAuthFailed(true);
          setStatus('auth_failed');
        });

      } catch (err) {
        console.error("[NaverMap] Init Error:", err);
        if (!isMounted) return;
        setStatus('error');
      }
    };

    const scriptId = 'naver-map-sdk-v3';
    if (window.naver && window.naver.maps) {
      setIsSDKLoaded(true);
      setTimeout(initMap, 200);
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      // ncpClientId와 submodules만 깔끔하게 전달 (v=1.1.11 제거됨)
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${CLIENT_ID}&submodules=geocoder`;
      script.async = true;
      script.onload = () => {
        setIsSDKLoaded(true);
        setTimeout(initMap, 500);
      };
      document.head.appendChild(script);
    }

    return () => { isMounted = false; };
  }, [CLIENT_ID]);

  // 마커 렌더링 로직 생략 (기존과 동일)
  // ... (생략)

  if (status === 'config_error') {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b1120', color: 'white' }}>
        <XCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
        <h2>환경 변수(Client ID)가 없습니다</h2>
        <p>Vercel 대시보드 혹은 .env 파일을 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative', background: '#0b0f19' }}>
      <div id="naver-map-container" style={{ width: '100%', height: '100%', minHeight: '500px' }} />
      {/* 상태 표시 UI 생략 */}
    </div>
  );
};

export default NaverMap;
