import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search, AlertTriangle, MapPin, Ruler, Star, Plus, Minus, X, Minimize2, Maximize2, Info } from 'lucide-react';
import BuildingDetailView from './BuildingDetailView';

const NaverMap = ({ matches, selectedMatch, isScanning, onStartScan }) => {
  const nMap = useRef(null);
  const mapRef = useRef(null); // DOM 참조를 위한 Ref 추가
  const panoRef = useRef(null); // 파노라마 전용 Ref
  const miniMapRef = useRef(null); // 미니맵 전용 Ref
  const miniMarker = useRef(null); // 방향 표시 마커 전용 Ref
  const panorama = useRef(null);
  const miniMap = useRef(null);
  const streetLayer = useRef(null);
  const markers = useRef([]);
  const infoWindowRoot = useRef(null);
  const [isCadastral, setIsCadastral] = useState(true);
  const [status, setStatus] = useState('loading'); 
  const [isAuthFailed, setIsAuthFailed] = useState(false);
  const [isStreetViewMode, setIsStreetViewMode] = useState(false);
  const [activePanoCoord, setActivePanoCoord] = useState(null);
  const [panoPov, setPanoPov] = useState({ heading: 0, pitch: 0 }); // POV 상태 추가
  const [showPanoLabels, setShowPanoLabels] = useState(true);
  const [isPanoMinimized, setIsPanoMinimized] = useState(false);

  // [파노라마 렌더링 후 초기화]
  useEffect(() => {
    if (!activePanoCoord || !panoRef.current) return;

    // 1. 파노라마 인스턴스 생성 또는 위치 업데이트
    if (!panorama.current) {
      panorama.current = new window.naver.maps.Panorama(panoRef.current, {
        position: activePanoCoord,
        pov: { heading: 0, pitch: 0, zoom: 1 },
        aroundControl: true,
      });

      // 위치 변경 시 미니맵 동기화 리스너
      window.naver.maps.Event.addListener(panorama.current, 'position_changed', () => {
        const newPos = panorama.current.getPosition();
        if (miniMap.current) miniMap.current.setCenter(newPos);
        if (miniMarker.current) miniMarker.current.setPosition(newPos);
      });

      // POV 변경 시 방향 아이콘 회전 리스너 (setIcon 사용으로 신뢰성 확보)
      window.naver.maps.Event.addListener(panorama.current, 'pov_changed', () => {
        const pov = panorama.current.getPov();
        if (miniMarker.current) {
          miniMarker.current.setIcon({
            content: `
              <div class="pano-direction-wrapper" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; transform: rotate(${pov.heading}deg); transition: transform 0.1s ease-out;">
                <div class="direction-cone" style="position: absolute; top: 0; width: 60px; height: 40px; background: rgba(34, 197, 94, 0.7); clip-path: polygon(50% 100%, 0 0, 100% 0); filter: blur(1px);"></div>
                <div style="position: relative; width: 14px; height: 14px; background: white; border: 2.5px solid #334155; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); z-index: 2;"></div>
              </div>
            `,
            anchor: new window.naver.maps.Point(40, 40)
          });
        }
      });
    } else {
      panorama.current.setPosition(activePanoCoord);
    }

    // 2. 미니맵 인스턴스 생성
    const initMiniMap = () => {
      if (!miniMapRef.current || miniMap.current) return;

      miniMap.current = new window.naver.maps.Map(miniMapRef.current, {
        center: activePanoCoord,
        zoom: 17,
        draggable: true,
        scrollWheel: false,
        mapDataControl: false
      });

      const miniStreetLayer = new window.naver.maps.StreetLayer();
      miniStreetLayer.setMap(miniMap.current);

      // 방향 표시 마커 추가 (초기 POV 반영)
      const initialPov = panorama.current ? panorama.current.getPov() : { heading: 0 };
      miniMarker.current = new window.naver.maps.Marker({
        position: activePanoCoord,
        map: miniMap.current,
        icon: {
          content: `
            <div class="pano-direction-wrapper" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; transform: rotate(${initialPov.heading}deg); transition: transform 0.1s ease-out;">
              <div class="direction-cone" style="position: absolute; top: 0; width: 60px; height: 40px; background: rgba(34, 197, 94, 0.7); clip-path: polygon(50% 100%, 0 0, 100% 0); filter: blur(1px);"></div>
              <div style="position: relative; width: 14px; height: 14px; background: white; border: 2.5px solid #334155; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); z-index: 2;"></div>
            </div>
          `,
          anchor: new window.naver.maps.Point(40, 40)
        }
      });
    };

    // DOM 렌더링 대기 후 미니맵 초기화
    const timer = setTimeout(initMiniMap, 300);
    return () => clearTimeout(timer);
  }, [activePanoCoord]);

  const initPanorama = (coord) => {
    setActivePanoCoord(coord);
  };

  const closePanorama = () => {
    setActivePanoCoord(null);
    if (miniMap.current) {
      miniMap.current = null;
    }
  };

  const toggleStreetView = () => {
    if (!nMap.current || !streetLayer.current) return;
    const isVisible = !!streetLayer.current.getMap();
    if (isVisible) {
      streetLayer.current.setMap(null);
      setIsStreetViewMode(false);
    } else {
      streetLayer.current.setMap(nMap.current);
      setIsStreetViewMode(true);
    }
  };
  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      if (!isMounted || !window.naver || !window.naver.maps || nMap.current) return;
      
      const mapContainer = mapRef.current;
      if (!mapContainer) return;

      try {
        const mapInstance = new window.naver.maps.Map(mapContainer, {
          center: new window.naver.maps.LatLng(37.5042513, 127.0402401),
          zoom: 14,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.naver.maps.MapTypeControlStyle.BUTTON,
            position: window.naver.maps.Position.TOP_LEFT
          },
          zoomControl: false, // 기본 컨트롤은 끕니다.
        });
        
        // 인스턴스 선점 저장
        nMap.current = mapInstance;
        streetLayer.current = new window.naver.maps.StreetLayer();

        window.naver.maps.Event.once(mapInstance, 'init', () => {
          if (!isMounted) return;
          setStatus('ready');
          console.log('✅ [V3-MAP-READY] Map Instance Created Successfully');
          
          // 지도가 잘리거나 사라지는 현상 방지를 위해 강제 리사이즈 트리거
          window.naver.maps.Event.trigger(mapInstance, 'resize');
        });

        window.naver.maps.Event.addListener(mapInstance, 'click', (e) => {
          if (streetLayer.current.getMap()) {
            initPanorama(e.coord);
          }
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

    const initMapProcess = () => {
      if (!isMounted) return;
      if (window.naver && window.naver.maps) {
        initMap();
      } else {
        // 아직 로드되지 않았다면 200ms 후 재시도
        setTimeout(initMapProcess, 200);
      }
    };

    initMapProcess();

    return () => { isMounted = false; };
  }, []);

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

        // [HQ] 더원에셋 본사 고정 핀 (역삼동 674-9) 추가
        const hqMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(37.5042513, 127.0402401),
          map: nMap.current,
          icon: {
            content: `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                <div class="pulsating-dot"></div>
                <div class="office-label">더원에셋</div>
              </div>
            `,
            anchor: new window.naver.maps.Point(6, 6)
          },
          zIndex: 999 // 본사 핀은 항상 최상단에 노출
        });
        markers.current.push(hqMarker);

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

  // [3] 선택된 매물로 부드럽게 이동
  useEffect(() => {
    if (!nMap.current || !selectedMatch || !selectedMatch.lat || !selectedMatch.lon) return;

    const targetPos = new window.naver.maps.LatLng(selectedMatch.lat, selectedMatch.lon);
    
    nMap.current.panTo(targetPos, {
      duration: 1500,
      easing: 'easeOutCubic'
    });
    
    // 약간의 딜레이 후 줌인 및 마커 클릭 효과 (선택 시각화)
    setTimeout(() => {
      if (nMap.current) nMap.current.setZoom(19, true);
    }, 1000);

  }, [selectedMatch]);

  const handleZoom = (delta) => {
    if (nMap.current) {
      const currentZoom = nMap.current.getZoom();
      nMap.current.setZoom(currentZoom + delta, true); // true로 애니메이션 활성화
    }
  };

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
    <div className="map-parent-container">
      <div id="map" ref={mapRef} />

      {/* 거리뷰 파노라마 오버레이 */}
      {activePanoCoord && (
        <div className={`pano-overlay ${isPanoMinimized ? 'minimized' : ''}`}>
          <div ref={panoRef} style={{ width: '100%', height: '100%' }} />
          
          {/* 상단 중앙 정보 레이블 & 토글 */}
          <div className="pano-info-label">
            <span>장소 · 방면정보 표기</span>
            <label className="switch">
              <input type="checkbox" checked={showPanoLabels} onChange={() => setShowPanoLabels(!showPanoLabels)} />
              <span className="slider"></span>
            </label>
            <span style={{ fontSize: '0.7rem', opacity: 0.8, color: showPanoLabels ? '#6366f1' : 'white' }}>
              {showPanoLabels ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* 상단 우측 컨트롤 세트 */}
          <div className="pano-top-controls">
            <button onClick={() => setIsPanoMinimized(!isPanoMinimized)} className="pano-control-btn" title={isPanoMinimized ? '확대' : '축소'}>
              {isPanoMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
            </button>
            <button onClick={closePanorama} className="pano-control-btn" title="닫기">
              <X size={20} />
            </button>
          </div>

          {/* 하단 UI (주소 및 미니맵) */}
          <div className="pano-bottom-ui">
            <div className="pano-address-box">
              <MapPin size={18} color="#6366f1" />
              <span>서울특별시 강남구 역삼동</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400, marginLeft: '10px' }}>2024년 01월 (최신)</span>
            </div>
            
            <div className="pano-minimap-container">
              <div className="minimap-resize-handle"></div>
              <div ref={miniMapRef} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>
      )}
      
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
        <>
          {/* 우측 상단 메인 액션 버튼 */}
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

          {/* 우측 중앙 툴바 컨트롤 모음 */}
          <div style={{ position: 'absolute', top: '140px', right: '20px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 거리뷰 버튼 */}
            <button 
              onClick={toggleStreetView} 
              className={`glass map-tool-btn ${isStreetViewMode ? 'active' : ''}`}
              style={{ color: isStreetViewMode ? 'var(--accent)' : '#334155' }}
            >
              <MapPin size={20} fill={isStreetViewMode ? 'var(--accent)' : 'none'} />
              <span className="tool-label">거리뷰</span>
            </button>
            
            {/* 거리 측정 버튼 */}
            <button className="glass map-tool-btn">
              <Ruler size={20} />
              <span className="tool-label">거리</span>
            </button>

            {/* 저장 버튼 */}
            <button className="glass map-tool-btn">
              <Star size={20} fill="none" />
              <span className="tool-label">저장</span>
            </button>

            {/* 줌 컨트롤 (이미지 스타일 반영) */}
            <div className="zoom-control-container">
              <button onClick={() => handleZoom(1)} className="zoom-btn-v2 top">
                <Plus size={18} />
              </button>
              <button onClick={() => handleZoom(-1)} className="zoom-btn-v2 bottom">
                <Minus size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NaverMap;
