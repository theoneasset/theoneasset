export const calculateMatchingRate = (source, master) => {
  let score = 0;
  const weights = {
    주소: 40,
    건물명: 30,
    전용면적: 15,
    층수: 10,
    가격: 5
  };

  // 주소 매칭 (지번주소 및 도로명주소 동시 비교)
  if (source.주소) {
    const isLotMatch = master.주소 && (source.주소 === master.주소 || master.주소.includes(source.주소) || source.주소.includes(master.주소));
    const isRoadMatch = master.도로명주소 && (source.주소 === master.도로명주소 || master.도로명주소.includes(source.주소) || source.주소.includes(master.도로명주소));
    
    if (source.주소 === master.주소 || source.주소 === master.도로명주소) {
      score += weights.주소;
    } else if (isLotMatch || isRoadMatch) {
      score += weights.주소 * 0.8; // 부분 일치 시 가중치 적용
    }
  }

  // 건물명 매칭
  if (source.건물명 && master.건물명) {
    if (source.건물명 === master.건물명) score += weights.건물명;
    else if (master.건물명.includes(source.건물명) || source.건물명.includes(master.건물명)) score += weights.건물명 * 0.8;
  }

  // 전용면적 매칭 (오차 범위 5% 이내)
  if (source.전용면적 && master.전용면적) {
    const diff = Math.abs(parseFloat(source.전용면적) - parseFloat(master.전용면적));
    if (diff / parseFloat(master.전용면적) < 0.05) score += weights.전용면적;
  }

  // 층수 매칭
  if (source.층수 && master.층수 && source.층수 === master.층수) {
    score += weights.층수;
  }

  // 가격 매칭 (오차 범위 10% 이내)
  if (source.가격 && master.가격) {
    const diff = Math.abs(parseFloat(source.가격) - parseFloat(master.가격));
    if (diff / parseFloat(master.가격) < 0.1) score += weights.가격;
  }

  return Math.round(score);
};

export const findBestMatch = (extractedData, masterList) => {
  let bestMatch = null;
  let maxRate = 0;

  masterList.forEach(master => {
    const rate = calculateMatchingRate(extractedData, master);
    if (rate > maxRate) {
      maxRate = rate;
      
      // [Data Integrity] 데이터 무결성 체크 및 플래그 설정
      let status = '정상';
      const isAddressPartial = extractedData.주소 !== master.주소 && 
                               (master.주소.includes(extractedData.주소) || extractedData.주소.includes(master.주소));
      const isAreaDifferent = Math.abs(parseFloat(extractedData.전용면적) - parseFloat(master.전용면적)) / parseFloat(master.전용면적) >= 0.05;

      if (isAddressPartial || isAreaDifferent) {
        status = '검토 필요';
      }

      bestMatch = { ...master, matchRate: rate, status: status };
    }
  });

  return bestMatch;
};
