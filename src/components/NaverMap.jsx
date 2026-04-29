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
  const [isHybrid, setIsHybrid] = useState(false);
  const [activePanoCoord, setActivePanoCoord] = useState(null);
  const [showPanoLabels, setShowPanoLabels] = useState(true);
  const [isPanoMinimized, setIsPanoMinimized] = useState(false);
  const [miniMapSize, setMiniMapSize] = useState({ width: 200, height: 160 });
  const [isResizing, setIsResizing] = useState(false);

  // [거리뷰 & 미니맵 인스턴스 초기화 및 동기화 로직]
  useEffect(() => {
    if (!activePanoCoord || !panoRef.current) {
      return () => {
        if (miniMap.current) miniMap.current = null;
        if (miniMarker.current) miniMarker.current = null;
      };
    }

    const initAll = () => {
      // 1. 파노라마 인스턴스 생성 및 리스너 바인딩
      if (!panorama.current) {
        panorama.current = new window.naver.maps.Panorama(panoRef.current, {
          position: activePanoCoord,
          pov: { heading: 0, pitch: 0, zoom: 1 },
          aroundControl: false,
        });

        // [핵심] 파노라마 로드 완료 후 강제 리사이즈 (검은 화면 방지 2중 방어)
        window.naver.maps.Event.once(panorama.current, 'init', () => {
          const forceResize = () => {
            if (panorama.current) {
              window.naver.maps.Event.trigger(panorama.current, 'resize');
              // 크기를 명시적으로 한 번 더 설정
              const size = panorama.current.getSize();
              panorama.current.setSize(size);
            }
          };
          setTimeout(forceResize, 100);
          setTimeout(forceResize, 300); // 2차 리사이즈로 타이밍 완벽 방어
        });

        // [핵심] 위치 변경 시 미니맵 중심 및 마커 좌표 동기화
        window.naver.maps.Event.addListener(panorama.current, 'position_changed', () => {
          const newPos = panorama.current.getPosition();
          if (miniMap.current) {
            miniMap.current.setCenter(newPos);
          }
          if (miniMarker.current) {
            miniMarker.current.setPosition(newPos);
          }
        });

        // POV 변경 리스너 (바닐라 JS 방식)
        window.naver.maps.Event.addListener(panorama.current, 'pov_changed', () => {
          const pov = panorama.current.getPov();
          const currentPan = (pov.heading !== undefined) ? pov.heading : (pov.pan || 0);
          const iconEl = document.getElementById('minimap-dir-icon');
          if (iconEl) iconEl.style.transform = `rotate(${currentPan}deg)`;
        });
      } else {
        panorama.current.setPosition(activePanoCoord);
        setTimeout(() => {
          window.naver.maps.Event.trigger(panorama.current, 'resize');
        }, 100);
      }

      // 2. 미니맵 인스턴스 생성 및 초기 마커 설정
      if (!miniMap.current && miniMapRef.current) {
        miniMap.current = new window.naver.maps.Map(miniMapRef.current, {
          center: activePanoCoord,
          zoom: 17,
          draggable: true,
          scrollWheel: false,
          mapDataControl: false
        });

        // [핵심 1] 미니맵 클릭 시 거리뷰 순간이동(Teleport) 리스너
        window.naver.maps.Event.addListener(miniMap.current, 'click', (e) => {
          if (panorama.current) {
            panorama.current.setPosition(e.coord);
            window.naver.maps.Event.trigger(panorama.current, 'resize');
          }
        });

        // [핵심 2] 미니맵 리사이즈 트리거
        window.naver.maps.Event.trigger(miniMap.current, 'resize');

        const miniStreetLayer = new window.naver.maps.StreetLayer();
        miniStreetLayer.setMap(miniMap.current);

        // [핵심 3] 방향 마커 및 동기화 초기화
        const currentPov = panorama.current ? panorama.current.getPov() : { heading: 0 };
        const currentPan = (currentPov.heading !== undefined) ? currentPov.heading : (currentPov.pan || 0);
        
        const markerHtml = `
          <div style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
            <div id="minimap-dir-icon" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: rotate(${currentPan}deg); transition: transform 0.1s ease-out;">
              <svg width="100" height="100" viewBox="0 0 100 100" style="overflow: visible;">
                <path d="M 50 50 L 25 10 A 40 40 0 0 1 75 10 Z" fill="rgba(34, 197, 94, 0.45)" stroke="rgba(34, 197, 94, 0.2)" stroke-width="0.5" />
                <circle cx="50" cy="50" r="7.5" fill="white" stroke="#334155" stroke-width="2.5" />
                <circle cx="50" cy="50" r="8" fill="none" stroke="black" stroke-opacity="0.1" stroke-width="0.5" />
              </svg>
            </div>
          </div>
        `;
        
        miniMarker.current = new window.naver.maps.Marker({
          position: activePanoCoord,
          map: miniMap.current,
          icon: {
            content: markerHtml,
            anchor: new window.naver.maps.Point(50, 50)
          }
        });
      }
    };

    const timer = setTimeout(initAll, 400);
    return () => clearTimeout(timer);
  }, [activePanoCoord]);

  // [미니맵 리사이즈 핸들러]
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      // 미니맵 컨테이너 위치 기준 마우스 좌표 계산
      const container = miniMapRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newWidth = Math.max(150, e.clientX - rect.left);
      const newHeight = Math.max(120, rect.bottom - e.clientY);

      setMiniMapSize({ width: newWidth, height: newHeight });
      
      // 지도 엔진에 즉시 알림 (선택 사항: 성능을 위해 debounce 가능)
      if (miniMap.current) {
        window.naver.maps.Event.trigger(miniMap.current, 'resize');
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // 드래그 종료 시 최종 리사이즈 확정
      if (miniMap.current) {
        window.naver.maps.Event.trigger(miniMap.current, 'resize');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
      // 거리뷰 레이어가 켜질 때 지도 타입 초기화 (선택 사항)
    }
  };

  const toggleHybrid = () => {
    if (!nMap.current) return;
    const newMode = !isHybrid;
    setIsHybrid(newMode);
    nMap.current.setMapTypeId(
      newMode ? window.naver.maps.MapTypeId.HYBRID : window.naver.maps.MapTypeId.NORMAL
    );
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
            
            <div 
              className="pano-minimap-container"
              style={{ 
                width: `${miniMapSize.width}px`, 
                height: `${miniMapSize.height}px`,
                cursor: isResizing ? 'nwse-resize' : 'default'
              }}
            >
              <div ref={miniMapRef} style={{ width: '100%', height: '100%' }} />
              
              {/* 네이버 스타일 리사이즈 핸들 (우측 상단) */}
              <div 
                className="mini-resize-handle"
                onMouseDown={handleResizeStart}
                title="사이즈 조절"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </svg>
              </div>

              {/* 미니맵 전용 줌 컨트롤 (+/-) */}
              <div className="mini-zoom-controls">
                <button 
                  className="mini-zoom-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // 지도 클릭 이벤트로 번지지 않게 차단
                    if (miniMap.current) {
                      const newZoom = miniMap.current.getZoom() + 1;
                      miniMap.current.setZoom(newZoom);
                    }
                  }}
                  title="확대"
                >
                  <Plus size={14} />
                </button>
                <div className="mini-zoom-divider"></div>
                <button 
                  className="mini-zoom-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // 지도 클릭 이벤트로 번지지 않게 차단
                    if (miniMap.current) {
                      const newZoom = miniMap.current.getZoom() - 1;
                      miniMap.current.setZoom(newZoom);
                    }
                  }}
                  title="축소"
                >
                  <Minus size={14} />
                </button>
              </div>
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
            {/* 항공뷰 버튼 */}
            <button 
              onClick={toggleHybrid} 
              className={`glass map-tool-btn ${isHybrid ? 'active' : ''}`}
            >
              <Layers size={20} />
              <span className="tool-label">항공뷰</span>
            </button>
            
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
