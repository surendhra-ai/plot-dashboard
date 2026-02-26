import { GoogleGenAI, Type } from "@google/genai";
import { PlotGeometry } from "../types";

/**
 * IMPORTANT:
 * In Vite, environment variables must start with VITE_
 * and accessed using import.meta.env
 */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Lazy initialization to avoid crash if key missing
const ai = API_KEY
  ? new GoogleGenAI({ apiKey: API_KEY })
  : null;

/**
 * Analyze a real estate layout image using Gemini Vision
 */
export const analyzeLayoutImage = async (
  base64Image: string
): Promise<PlotGeometry[]> => {
  // If API key not configured, return mock data safely
  if (!API_KEY || !ai) {
    console.warn(
      "VITE_GEMINI_API_KEY not found. Returning mock plot data."
    );
    return getMockPlots();
  }

  // Extract base64 data & mime type safely
  const base64Data = base64Image.includes("base64,")
    ? base64Image.split("base64,")[1]
    : base64Image;

  const mimeType =
    base64Image.match(/data:([^;]*);/)?.[1] || "image/png";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `
You are an expert real estate layout analyzer.

Task:
Extract all plots from the provided real estate layout image.

Instructions:
1. Identify every plot, lot, or labeled unit.
2. Determine precise bounding boxes.
3. Return normalized coordinates [ymin, xmin, ymax, xmax] (0–1000 scale).
4. Be extremely thorough.
5. Return strictly valid JSON matching the schema.
`,
          },
        ],
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
                  id: {
                    type: Type.STRING,
                    description:
                      "The distinct plot number or label visible",
                  },
                  box_2d: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description:
                      "ymin, xmin, ymax, xmax (0-1000 scale)",
                  },
                },
                required: ["id", "box_2d"],
              },
            },
          },
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);

    if (parsed?.plots && Array.isArray(parsed.plots)) {
      return parsed.plots;
    }

    return [];
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return getMockPlots();
  }
};

/**
 * Mock fallback data
 */
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
          200 + col * 180, // xmax
        ],
      });
    }
  }

  return plots;
};
