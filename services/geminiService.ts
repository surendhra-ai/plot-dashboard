import { GoogleGenAI, Type } from "@google/genai";
import { PlotGeometry } from "../types";

/**
 * IMPORTANT:
 * In Vite, environment variables must start with VITE_
 * and accessed using import.meta.env
 */
const API_KEY = process.env.GEMINI_API_KEY;

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
  // If API key not configured, throw a specific error
  if (!API_KEY || !ai) {
    throw new Error("GEMINI_API_KEY_MISSING");
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
    throw error;
  }
};