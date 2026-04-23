import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import KakaoMap from './components/KakaoMap';
import { naverService } from './api/naver';
import { geminiService } from './api/gemini';
import { airtableService } from './api/airtable';
import { findBestMatch } from './api/matchingEngine';
import { solapiService } from './api/solapi';
import './index.css';

function App() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [masterBuildings, setMasterBuildings] = useState([]);

  // 초기 마스터 데이터 로드
  useEffect(() => {
    const loadMasterData = async () => {
      const data = await airtableService.getMasterBuildings();
      setMasterBuildings(data);
    };
    loadMasterData();
  }, []);

  const runScanningProcess = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);

    const keywords = ['강남구 사무실 임대', '역삼동 빌딩 매매', '서초동 상가 임대'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    console.log(`[Scanning] 키워드: ${randomKeyword}`);
    const blogItems = await naverService.searchBlogs(randomKeyword);

    for (const item of blogItems) {
      // 이미 처리된 링크인지 확인 (중복 방지 로직 필요시 추가)
      
      // 1. Gemini로 데이터 추출
      const extracted = await geminiService.extractBuildingInfo(item.description + " " + item.title);
      
      if (extracted && extracted.주소) {
        // 2. 마스터 DB와 매칭
        const matchResult = findBestMatch(extracted, masterBuildings);
        
        if (matchResult) {
          const finalData = {
            ...matchResult,
            summary: extracted.요약,
            link: item.link,
            rawExtracted: extracted
          };

          setMatches(prev => [finalData, ...prev].slice(0, 50)); // 최근 50개 유지

          // 3. 90% 이상인 경우 처리
          if (matchResult.matchRate >= 90) {
            // Airtable 저장
            await airtableService.saveMatchResult(finalData);
            
            // 솔라피 알림 발송
            await solapiService.sendAlimtalk({
              matchRate: matchResult.matchRate,
              address: matchResult.주소,
              price: matchResult.가격
            });
          }
        }
      }
      
      // API 할당량 및 과부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsScanning(false);
  }, [isScanning, masterBuildings]);

  // 주기적 스캔 실행 (예: 5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      runScanningProcess();
    }, 300000); 

    // 즉시 실행 버튼 등을 위해 최초 1회는 수동 실행 가능하게 두거나 
    // 여기서는 마스터 데이터 로드 후 1회 실행
    if (masterBuildings.length > 0 && matches.length === 0) {
      runScanningProcess();
    }

    return () => clearInterval(interval);
  }, [masterBuildings, runScanningProcess, matches.length]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar 
        matches={matches} 
        onSelectMatch={setSelectedMatch} 
        isScanning={isScanning} 
      />
      
      <div style={{ flex: 1, position: 'relative' }}>
        <KakaoMap 
          matches={matches} 
          selectedMatch={selectedMatch} 
        />
        
        {/* 컨트롤 패널 (수동 스캔 버튼 등) */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px', 
          zIndex: 5,
          display: 'flex',
          gap: '10px'
        }}>
          <button 
            onClick={runScanningProcess}
            disabled={isScanning}
            className="glass"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '700',
              border: '1px solid var(--primary)',
              background: isScanning ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.6)'
            }}
          >
            {isScanning ? '스캐닝 중...' : '지금 수집 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
