
import { GoogleGenAI } from "@google/genai";

// Use process.env.API_KEY directly as per guidelines.
export const getSmartAnalytics = async (electionData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following election results and provide a 3-paragraph executive summary including: 1. Current leader and margin 2. Voter turnout trends 3. Possible anomalies or regions of concern. Data: ${JSON.stringify(electionData)}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate smart analytics. Please try again later.";
  }
};
