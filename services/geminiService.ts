import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ScanResult } from '../types';

const scanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    odometer: { type: Type.NUMBER, description: "Vehicle odometer reading (mileage)" },
    gallons: { type: Type.NUMBER, description: "Fuel volume in gallons" },
    pricePerGallon: { type: Type.NUMBER, description: "Price per single gallon" },
    totalCost: { type: Type.NUMBER, description: "Total transaction cost" },
  },
};

const getApiKey = (): string => {
  // 1. Check environment variable (Build time / Server)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Check Local Storage (User entered)
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) return storedKey;

  return '';
};

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<ScanResult> => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      throw new Error("API Key missing. Please go to Settings and enter your Gemini API Key.");
    }

    const ai = new GoogleGenAI({ apiKey });
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