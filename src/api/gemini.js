import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const geminiService = {
  async extractBuildingInfo(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      다음은 부동산 매물 관련 텍스트입니다. 여기서 정보를 추출해서 JSON 형식으로 응답해주세요.
      필수 항목: { "주소": "지번 주소 포함 정확한 주소", "건물명": "건물 이름", "전용면적": "숫자만(m2)", "층수": "숫자만", "가격": "숫자만(만원)", "요약": "매물 특징 요약(한 줄)" }
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
  }
};
