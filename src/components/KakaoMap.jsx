import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import PriceChart from './PriceChart';

const KakaoMap = ({ matches, selectedMatch }) => {
  const mapRef = useRef(null);
  const kakaoMap = useRef(null);
  const markers = useRef([]);
  const infoWindowRoot = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 7
        };
        kakaoMap.current = new window.kakao.maps.Map(mapRef.current, options);
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!kakaoMap.current || !matches) return;

    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    const geocoder = new window.kakao.maps.services.Geocoder();

    matches.forEach(match => {
      if (match.matchRate < 90) return;

      geocoder.addressSearch(match.주소, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

          const marker = new window.kakao.maps.Marker({
            map: kakaoMap.current,
            position: coords,
            title: match.건물명
          });

          // 인포윈도우를 위한 DOM 컨테이너 생성
          const contentContainer = document.createElement('div');
          contentContainer.className = 'custom-infowindow';
          
          const infowindow = new window.kakao.maps.InfoWindow({
            content: contentContainer,
            removable: true
          });

          window.kakao.maps.event.addListener(marker, 'click', () => {
            infowindow.open(kakaoMap.current, marker);
            
            // React 컴포넌트 렌더링
            if (infoWindowRoot.current) {
              infoWindowRoot.current.unmount();
            }
            
            infoWindowRoot.current = createRoot(contentContainer);
            infoWindowRoot.current.render(
              <div className="infowindow-inner">
                <div className="infowindow-title">{match.matchRate}% Match: {match.건물명}</div>
                <div className="infowindow-content">
                  <p><strong>주소:</strong> {match.주소}</p>
                  <p><strong>가격:</strong> {match.가격}만원</p>
                  <p><strong>면적:</strong> {match.전용면적}m²</p>
                  
                  {/* 가격 변동 추이 차트 추가 */}
                  <PriceChart address={match.주소} />
                  
                  <a href={match.link} target="_blank" rel="noopener noreferrer" className="infowindow-link">원문 링크 보기</a>
                </div>
              </div>
            );
          });

          markers.current.push(marker);
        }
      });
    });
  }, [matches]);

  useEffect(() => {
    if (!kakaoMap.current || !selectedMatch) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(selectedMatch.주소, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        kakaoMap.current.setCenter(coords);
        kakaoMap.current.setLevel(3);
      }
    });
  }, [selectedMatch]);

  return <div ref={mapRef} className="map-container" />;
};

export default KakaoMap;
