import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import NaverMap from './components/NaverMap';
import AdminDashboard from './components/AdminDashboard';
import BuildingDetailView from './components/BuildingDetailView';
import ErrorBoundary from './components/ErrorBoundary';
import { naverService } from './api/naver';
import { geminiService } from './api/gemini';
import { airtableService } from './api/airtable';
import { findBestMatch } from './api/matchingEngine';
import { solapiService } from './api/solapi';
import { motion, AnimatePresence } from 'framer-motion';
import { Map as MapIcon, LayoutDashboard, AlertTriangle } from 'lucide-react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' or 'admin'
  const [matches, setMatches] = useState([]);
  
  // [DEBUG] Airtable 환경 변수 가드
  const AIRTABLE_KEY = import.meta.env.VITE_MY_AIRTABLE_API_KEY;
  const AIRTABLE_BASE = import.meta.env.VITE_MY_AIRTABLE_BASE_ID;

  if (!AIRTABLE_KEY || !AIRTABLE_BASE) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b1120', color: 'white', textAlign: 'center', padding: '20px' }}>
        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '16px', color: '#ef4444' }}>
          에어테이블 환경 변수 미설정 (Check Vercel Settings)
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
          VITE_MY_AIRTABLE_API_KEY 또는 VITE_MY_AIRTABLE_BASE_ID가 확인되지 않습니다.<br/>
          Vercel 대시보드의 Environment Variables 설정을 확인해 주세요.
        </p>
      </div>
    );
  }

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [masterBuildings, setMasterBuildings] = useState([]);
  const [filters, setFilters] = useState({
    selectedDongs: [],
    minDeposit: 0,
    maxDeposit: 10000000000, // 100억
    minRent: 0,
    maxRent: 1000000000 // 10억
  });
  const [recentMatch, setRecentMatch] = useState(null);

  const triggerToast = (match) => {
    setRecentMatch(match);
    setTimeout(() => setRecentMatch(null), 5000); // 5초 후 사라짐
  };

  const injectTestData = useCallback(() => {
    const testData = [
      {
        id: 'test-2',
        주소: '서울특별시 강남구 논현동 123-4',
        건물명: '논현 스마트 빌딩',
        보증금: 200000000,
        월세: 12000000,
        전용면적: 820,
        matchRate: 85,
        lat: 37.5112,
        lon: 127.0214,
        summary: '강남대로 이면, 신축급 관리 상태 최상의 통임대 매물',
        link: 'https://land.naver.com',
        isExclusive: true,
        analysisReport: "강남대로 영동시장 이면에 위치한 신축급 통임대 매물입니다. AI 분석 결과 연면적과 층별 구성이 마스터 DB의 논현 스마트 빌딩과 85% 일치합니다. 내부 리모델링 여부를 확인하면 95% 이상 매칭 가능합니다."
      },
      {
        id: 'test-3',
        주소: '서울특별시 강남구 삼성동 158-1',
        건물명: '삼성 테헤란 오피스',
        보증금: 50000000,
        월세: 4500000,
        전용면적: 310,
        matchRate: 65,
        lat: 37.5088,
        lon: 127.0631,
        summary: '삼성역 도보 5분, 대형 로펌 및 IT 기업 선호 입지',
        link: 'https://land.naver.com',
        isExclusive: false,
        analysisReport: "삼성역 인근 오피스 밀집 구역의 매물입니다. 현재 정보상으로는 마스터 DB의 여러 건물과 중첩되는 정보가 있어 정밀 검토가 필요합니다. 전용 면적 정보를 추가 확보 시 매칭률이 상승할 것으로 보입니다."
      }
    ];

    setMatches(testData);
    testData.forEach((match, index) => {
      setTimeout(() => triggerToast(match), 1000 * (index + 1));
    });
  }, []);

  useEffect(() => {
    const loadMasterData = async () => {
      const data = await airtableService.getMasterBuildings();
      setMasterBuildings(data);
    };
    loadMasterData();
    injectTestData();
  }, []); // 의존성 배열을 비워 최초 마운트 시에만 실행되도록 함

  const filteredMatches = matches.filter(match => {
    const matchesDong = filters.selectedDongs.length === 0 || 
                       filters.selectedDongs.some(dong => (match.주소 || '').includes(dong));
    
    const deposit = match.보증금 || match.가격 || 0;
    const rent = match.월세 || 0;

    const matchesDeposit = deposit >= filters.minDeposit && deposit <= filters.maxDeposit;
    const matchesRent = rent >= filters.minRent && rent <= filters.maxRent;
    
    return matchesDong && matchesDeposit && matchesRent;
  });

  const runScanningProcess = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);

    const keywords = ['강남구 사무실 임대', '역삼동 빌딩 매매', '서초동 상가 임대'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const blogItems = await naverService.searchBlogs(randomKeyword);

    for (const item of blogItems) {
      const extracted = await geminiService.extractBuildingInfo(item.description + " " + item.title);
      if (extracted && extracted.주소) {
        const matchResult = findBestMatch(extracted, masterBuildings);
        if (matchResult) {
          // [Data Integrity Guard] 모든 필드에 대해 널 체크 및 기본값 처리
          const finalData = {
            ...matchResult,
            주소: matchResult.주소 || extracted.주소,
            건물명: matchResult.건물명 || extracted.건물명,
            summary: extracted.요약,
            link: item.link,
            rawExtracted: extracted || {},
            isExclusive: (matchResult.matchRate || 0) >= 95,
            analysisReport: extracted.요약
          };

          setMatches(prev => {
            const newMatches = [finalData, ...prev].slice(0, 50);
            if ((matchResult.matchRate || 0) >= 90) triggerToast(finalData);
            return newMatches;
          });

          if ((matchResult.matchRate || 0) >= 90) {
            await airtableService.saveMatchResult(finalData);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    }
    setIsScanning(false);
  }, [isScanning, masterBuildings]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar 
        matches={filteredMatches} 
        filters={filters}
        setFilters={setFilters}
        onSelectMatch={setSelectedMatch} 
        isScanning={isScanning} 
        onInjectTest={injectTestData}
      />
      
      <div style={{ flex: 1, position: 'relative', background: '#0f172a' }}>
        <div className="view-toggle-nav">
          <div className="toggle-container glass">
            <button 
              className={`toggle-item ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <MapIcon size={18} />
              <span>실시간 지도</span>
            </button>
            <button 
              className={`toggle-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <LayoutDashboard size={18} />
              <span>분석 대시보드</span>
            </button>
          </div>
        </div>

        <ErrorBoundary>
          {activeTab === 'map' ? (
            <NaverMap 
              matches={filteredMatches} 
              selectedMatch={selectedMatch} 
              isScanning={isScanning}
              onStartScan={runScanningProcess}
            />
          ) : (
            <AdminDashboard matches={matches} />
          )}
        </ErrorBoundary>
      </div>

      <AnimatePresence>
        {recentMatch && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="toast-notification"
          >
            <div className="glass toast-inner">
              <div className="toast-header">
                <span className="badge">NEW DISCOVERY</span>
                <span className="rate">{recentMatch.matchRate}% Match</span>
              </div>
              <div className="toast-title">{recentMatch.주소}</div>
              <div className="toast-desc">{recentMatch.건물명} 분석 완료</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .view-toggle-nav {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        }
        .toggle-container {
          display: flex;
          padding: 6px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .toggle-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-item.active {
          background: var(--accent);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          width: 320px;
        }
        .toast-inner {
          padding: 16px;
          border-radius: 16px;
          border-left: 4px solid var(--accent);
          background: rgba(15, 23, 42, 0.95);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .toast-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .toast-header .badge { font-size: 0.65rem; color: var(--accent); font-weight: 800; letter-spacing: 1px; }
        .toast-header .rate { font-size: 0.8rem; font-weight: 800; color: #34d399; }
        .toast-title { font-weight: 700; font-size: 0.9rem; color: white; margin-bottom: 4px; }
        .toast-desc { font-size: 0.75rem; color: #94a3b8; }
      `}</style>
    </div>
  );
}

export default App;
