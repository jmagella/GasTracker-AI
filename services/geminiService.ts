import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ScanResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const scanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    odometer: { type: Type.NUMBER, description: "Vehicle odometer reading (mileage)" },
    gallons: { type: Type.NUMBER, description: "Fuel volume in gallons" },
    pricePerGallon: { type: Type.NUMBER, description: "Price per single gallon" },
    totalCost: { type: Type.NUMBER, description: "Total transaction cost" },
  },
};

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<ScanResult> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this image. It is likely a gas pump display or a car odometer dashboard. Extract any visible numbers related to: Odometer reading, Gallons fueled, Price per gallon, or Total Cost. If a value is clearly not present, return null for that field.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: scanSchema,
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const text = response.text;
    if (!text) return { odometer: null, gallons: null, pricePerGallon: null, totalCost: null };
    
    return JSON.parse(text) as ScanResult;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};
