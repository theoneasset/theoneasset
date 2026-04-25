import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search } from 'lucide-react';
import BuildingDetailView from './BuildingDetailView';

const VWorldMap = ({ matches, selectedMatch, isScanning, onStartScan }) => {
  const mapRef = useRef(null);
  const vMap = useRef(null);
  const markers = useRef([]);
  const infoWindowRoot = useRef(null);
  const [isCadastral, setIsCadastral] = useState(true);

  useEffect(() => {
    console.log("[VWorldMap] Component mounted, waiting for VWorld libraries from index.html...");
    
    let retryCount = 0;
    const maxRetries = 20; // 20초 (1초 간격)

    const checkLoaded = setInterval(() => {
      const vw = window.vw;
      const ol = vw && vw.ol;
      const vmap = ol && ol.vmap;

      if (vmap) {
        console.log("[VWorldMap] VWorld libraries ready. Initializing map...");
        clearInterval(checkLoaded);
        
        try {
          vMap.current = new window.vw.ol.vmap.Map(mapRef.current, {
            center: [127.0374, 37.5028], // 역삼동 674-8 (경도, 위도)
            zoom: 18,
            baseMode: "base", // 기본 지도
            controlChart: true,
          });

          // 초기 레이어 설정 (주거/상업/지적도)
          if (isCadastral) {
            vMap.current.addLayerByName("LT_C_UQ111"); // 주거지역
            vMap.current.addLayerByName("LT_C_UQ112"); // 상업지역
            vMap.current.addLayerByName("LP_PA_CBND_BUBUN"); // 지적도
            
            // 반투명 설정 (OpenLayers 레이어 객체 접근)
            setTimeout(() => {
              ["LT_C_UQ111", "LT_C_UQ112"].forEach(name => {
                const layer = vMap.current.getLayerByName(name);
                if (layer) {
                  layer.setOpacity(0.5);
                  console.log(`[VWorldMap] Layer ${name} opacity set to 0.5`);
                }
              });
            }, 2000);
          }
        } catch (error) {
          console.error("[VWorldMap] Map Init Error:", error);
        }
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          clearInterval(checkLoaded);
          console.error("[VWorldMap] Failed to load VWorld libraries after 20 seconds. Please check browser blocking or API key.");
        } else {
          console.log(`[VWorldMap] Still waiting for vmap sub-library... (${retryCount}/${maxRetries})`);
        }
      }
    }, 1000);

    return () => {
      if (checkLoaded) clearInterval(checkLoaded);
    };
  }, []);

  // 지적도 토글
  const toggleCadastral = () => {
    if (!vMap.current) return;
    const nextState = !isCadastral;
    setIsCadastral(nextState);
    
    const layers = ["LT_C_UQ111", "LT_C_UQ112", "LP_PA_CBND_BUBUN"];
    
    if (nextState) {
      layers.forEach(name => {
        vMap.current.addLayerByName(name);
        if (name !== "LP_PA_CBND_BUBUN") {
          setTimeout(() => {
            const layer = vMap.current.getLayerByName(name);
            if (layer) layer.setOpacity(0.5);
          }, 500);
        }
      });
      // 버튼 클릭 시 역삼동 위치로 이동
      vMap.current.setCenterAndZoom(127.0374, 37.5028, 18);
    } else {
      layers.forEach(name => vMap.current.hideLayerByName(name));
    }
  };

  useEffect(() => {
    if (!vMap.current || !matches) return;

    // 기존 마커 제거
    markers.current.forEach(m => vMap.current.removeOverlay(m));
    markers.current = [];

    matches.forEach(match => {
      if (match.matchRate < 90) return;

      // [Security] 환경 변수에서 키를 읽어오도록 수정 (하드코딩 제거)
      const apiKey = import.meta.env.VITE_VWORLD_KEY;
      if (!apiKey) return;

      const geocodeUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:3857&address=${encodeURIComponent(match.주소)}&refine=true&simple=false&format=json&type=parcel&key=${apiKey}`;

      fetch(geocodeUrl)
        .then(res => res.json())
        .then(data => {
          if (data.response?.status === 'OK') {
            const x = parseFloat(data.response.result.point.x);
            const y = parseFloat(data.response.result.point.y);

            // 마커 생성
            const marker = vMap.current.addMarker({
              x: x,
              y: y,
              msg: `<div class="vworld-marker-label">${match.matchRate}%</div>`,
              title: match.건물명,
              icon: 'https://map.vworld.kr/images/ol3/marker_blue.png'
            });

            // 마커 클릭 이벤트
            marker.on('click', () => {
              const contentContainer = document.createElement('div');
              contentContainer.className = 'naver-infowindow glass'; // 기존 CSS 재사용
              
              // 인포윈도우 대신 팝업 레이어 생성 (VWorld 전용)
              vMap.current.showPopup({
                x: x,
                y: y,
                content: contentContainer
              });

              if (infoWindowRoot.current) {
                infoWindowRoot.current.unmount();
              }
              infoWindowRoot.current = createRoot(contentContainer);
              infoWindowRoot.current.render(<BuildingDetailView match={match} />);
            });

            markers.current.push(marker);
          }
        });
    });
  }, [matches]);

  useEffect(() => {
    if (!vMap.current || !selectedMatch) return;
    // 선택된 매물로 이동 로직...
  }, [selectedMatch]);

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '600px', backgroundColor: '#111' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {/* 우측 상단 컨트롤 패널 */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '12px'
      }}>
        {/* 수집 시작 버튼 */}
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
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            transition: 'all 0.2s'
          }}
        >
          <Search size={16} className={isScanning ? 'animate-spin' : ''} />
          <span>{isScanning ? '스캐닝 중...' : '지금 수집 시작'}</span>
        </button>

        {/* 지적도 토글 버튼 */}
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
            background: 'rgba(30, 41, 59, 0.5)',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}
        >
          <Layers size={18} />
          <span>브이월드 지적도 {isCadastral ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* 하단 지적도 범례 안내 */}
      {isCadastral && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '30px',
          right: '30px',
          zIndex: 100,
          padding: '12px 20px',
          borderRadius: '16px',
          fontSize: '0.8rem',
          display: 'flex',
          gap: '20px',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(15px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', background: '#FF0000', opacity: 0.7, borderRadius: '4px', border: '1.5px solid white' }}></div>
            <span style={{ fontWeight: '700', color: '#fca5a5' }}>상업지역</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', background: '#FFFF00', opacity: 0.7, borderRadius: '4px', border: '1.5px solid white' }}></div>
            <span style={{ fontWeight: '700', color: '#fef08a' }}>주거지역</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VWorldMap;
