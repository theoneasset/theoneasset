import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import NaverMap from './components/NaverMap';
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
  const [filters, setFilters] = useState({
    dong: '',
    minPrice: 0,
    maxPrice: 1000000,
    minArea: 0
  });

  // 초기 마스터 데이터 로드
  useEffect(() => {
    const loadMasterData = async () => {
      const data = await airtableService.getMasterBuildings();
      setMasterBuildings(data);
    };
    loadMasterData();
  }, []);

  // 필터링된 매물 리스트
  const filteredMatches = matches.filter(match => {
    const matchesDong = !filters.dong || match.주소.includes(filters.dong);
    const matchesPrice = match.가격 >= filters.minPrice && match.가격 <= filters.maxPrice;
    const matchesArea = match.전용면적 >= filters.minArea;
    return matchesDong && matchesPrice && matchesArea;
  });

  const runScanningProcess = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);

    const keywords = ['강남구 사무실 임대', '역삼동 빌딩 매매', '서초동 상가 임대'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    console.log(`[Scanning] 키워드: ${randomKeyword}`);
    const blogItems = await naverService.searchBlogs(randomKeyword);

    for (const item of blogItems) {
      // 1. Gemini로 기본 데이터 추출
      const extracted = await geminiService.extractBuildingInfo(item.description + " " + item.title);
      
      if (extracted && extracted.주소) {
        // 2. [고도화] 네이버 지도를 통한 상세 데이터 수집
        const detailHtml = await naverService.scrapeFullContent(extracted.주소);
        
        // 3. Gemini로 입점 현황 및 건물 상세 정보 파싱
        const deepInfo = await geminiService.analyzeDeepBuildingInfo(detailHtml, extracted);
        
        // 4. 마스터 DB와 매칭
        const matchResult = findBestMatch(extracted, masterBuildings);
        
        if (matchResult) {
          // 5. 입점 현황 기반 매칭률 보정
          let finalMatchRate = matchResult.matchRate;
          if (deepInfo.isFloorVacancy || deepInfo.industryMatch) {
            finalMatchRate = Math.min(100, finalMatchRate + 20); // 신뢰도 가산
          }

          const finalData = {
            ...matchResult,
            matchRate: finalMatchRate,
            summary: extracted.요약,
            link: item.link,
            tenantInfo: deepInfo.tenantList,
            analysisReport: deepInfo.analysisReport,
            rawExtracted: { ...extracted, ...deepInfo.specs }
          };

          setMatches(prev => [finalData, ...prev].slice(0, 50));

          const isFilterMatch = 
            (!filters.dong || finalData.주소.includes(filters.dong)) &&
            (finalData.가격 >= filters.minPrice && finalData.가격 <= filters.maxPrice) &&
            (finalData.전용면적 >= filters.minArea);

          if (finalMatchRate >= 90 && isFilterMatch) {
            await airtableService.saveMatchResult(finalData);
            await solapiService.sendAlimtalk({
              matchRate: finalMatchRate,
              address: finalData.주소,
              price: finalData.가격
            });
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    }

    setIsScanning(false);
  }, [isScanning, masterBuildings, filters]);

  // 주기적 스캔 실행
  useEffect(() => {
    const interval = setInterval(() => {
      runScanningProcess();
    }, 300000); 

    if (masterBuildings.length > 0 && matches.length === 0) {
      runScanningProcess();
    }

    return () => clearInterval(interval);
  }, [masterBuildings, runScanningProcess, matches.length]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar 
        matches={filteredMatches} 
        filters={filters}
        setFilters={setFilters}
        onSelectMatch={setSelectedMatch} 
        isScanning={isScanning} 
      />
      
      <div style={{ flex: 1, position: 'relative' }}>
        <NaverMap 
          matches={filteredMatches} 
          selectedMatch={selectedMatch} 
        />
        
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '120px', 
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
