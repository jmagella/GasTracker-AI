import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ScanResult } from '../types';

const scanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    imageType: {
      type: Type.STRING,
      enum: ["pump", "odometer", "unknown"],
      description: "Classify the image as a gas pump display, vehicle odometer, or unknown."
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 1 indicating how certain the model is about the extracted values."
    },
    odometer: { type: Type.NUMBER, description: "Vehicle odometer reading (mileage). Only if imageType is odometer." },
    gallons: { type: Type.NUMBER, description: "Fuel volume in gallons. Only if imageType is pump." },
    pricePerGallon: { type: Type.NUMBER, description: "Price per single gallon. Only if imageType is pump." },
    totalCost: { type: Type.NUMBER, description: "Total transaction cost. Only if imageType is pump." },
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
            text: "Analyze this image. First, determine if it is a 'pump' (gas station pump display) or an 'odometer' (car dashboard). Then extract the visible numbers relevant to that type. For a pump, extract gallons, price per gallon, and total cost. For an odometer, extract the total mileage. Return a confidence score (0.0 to 1.0) based on legibility.",
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
    if (!text) return { odometer: null, gallons: null, pricePerGallon: null, totalCost: null, imageType: 'unknown', confidence: 0 };
    
    return JSON.parse(text) as ScanResult;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};