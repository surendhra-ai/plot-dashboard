import { GoogleGenAI, Type } from "@google/genai";
import { PlotGeometry } from '../types';

// Initialize Gemini Client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLayoutImage = async (base64Image: string): Promise<PlotGeometry[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock data for demonstration.");
    return getMockPlots(); 
  }

  // Robustly extract base64 data and mime type
  const base64Data = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;
    
  const mimeType = base64Image.match(/data:([^;]*);/)?.[1] || 'image/png';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `You are an expert real estate layout analyzer.
            
            Task: detailed extraction of all plots from the provided real estate layout image.
            
            Instructions:
            1. Identify every single plot, lot, or unit that has a number or label (e.g., "1", "101", "A-5", "Plot 4").
            2. For each plot, determine its PRECISE bounding box. The box should encompass the entire boundary of the plot, not just the text label.
            3. Return the coordinates normalized to a 0-1000 scale [ymin, xmin, ymax, xmax].
            4. Be extremely thorough. If there are 50 plots, return 50 entries.
            
            Output strictly valid JSON matching the schema.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "The distinct plot number or label visible on the image" },
                  box_2d: { 
                    type: Type.ARRAY, 
                    items: { type: Type.NUMBER }, 
                    description: "ymin, xmin, ymax, xmax (0-1000 scale)" 
                  }
                },
                required: ["id", "box_2d"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text || "{}";
    const result = JSON.parse(jsonText);
    
    if (result.plots && Array.isArray(result.plots)) {
      return result.plots;
    }
    return [];

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return getMockPlots();
  }
};

const getMockPlots = (): PlotGeometry[] => {
  const plots: PlotGeometry[] = [];
  let id = 1;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      plots.push({
        id: `P-${id++}`,
        box_2d: [
          100 + row * 200, // ymin
          50 + col * 180,  // xmin
          250 + row * 200, // ymax
          200 + col * 180  // xmax
        ]
      });
    }
  }
  return plots;
}