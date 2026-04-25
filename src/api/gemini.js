import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_MY_GEMINI_API_KEY);

export const geminiService = {
  async extractBuildingInfo(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      다음은 부동산 매물 관련 텍스트입니다. 여기서 정보를 추출해서 JSON 형식으로 응답해주세요.
      필수 항목: { "주소": "지번 주소 포함 정확한 주소", "건물명": "건물 이름", "전용면적": "숫자만(m2)", "층수": "숫자만", "가격": "숫자만(원)", "요약": "매물 특징 요약(한 줄)" }
      만약 정보가 없으면 null로 표시하세요.
      
      텍스트:
      ${text}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Gemini Error:", error);
      return null;
    }
  },

  async analyzeDeepBuildingInfo(html, extractedData) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      다음은 네이버 지도에서 수집한 건물의 상세 페이지 HTML 데이터(일부)와 우리가 추출한 매물 정보입니다.
      
      [매물 정보]
      주소: ${extractedData.주소}
      해당 층: ${extractedData.층수}
      
      [수집 데이터]
      ${html?.substring(0, 5000)} // 토큰 제한 고려
      
      요구사항:
      1. 이 데이터에서 건물 스펙(연면적, 주차, 승강기)을 찾아주세요.
      2. 층별 입점 현황(tenant list)을 파싱해주세요.
      3. 매물이 나온 층수가 현재 입점 현황상 '공실'이거나, 업종이 변경될 가능성이 있는지 판단해주세요.
      4. 위 데이터를 종합하여 부동산 전문가 관점에서 분석 리포트를 2-3문장으로 작성해주세요.
      
      응답 형식 (JSON):
      {
        "specs": { "연면적": "...", "주차": "...", "승강기": "..." },
        "tenantList": [ { "floor": "1F", "name": "...", "type": "..." } ],
        "isFloorVacancy": true/false,
        "industryMatch": true/false,
        "analysisReport": "..."
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Gemini Deep Analysis Error:", error);
      return { specs: {}, tenantList: [], isFloorVacancy: false, industryMatch: false, analysisReport: "데이터 분석 중 오류가 발생했습니다." };
    }
  }
};
