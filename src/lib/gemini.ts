import { GoogleGenAI } from "@google/genai";
import { POI } from "../types";

// Use the platform provided Gemini API key
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface GroundingResult {
  text: string;
  locations: {
    title: string;
    uri: string;
    lat?: number;
    lng?: number;
  }[];
}

export async function getMapsAssistance(
  prompt: string, 
  userLocation: { lat: number; lng: number }
): Promise<GroundingResult> {
  try {
    const model = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
            retrievalConfig: {
                latLng: {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng
                }
            }
        }
      },
    });

    const text = response.text || "No response generated.";
    
    // Extract grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const locations = groundingChunks
      .map((chunk: any) => {
        const data = chunk.maps || chunk.web;
        if (data?.uri && data?.title) {
          return {
            title: data.title,
            uri: data.uri,
          };
        }
        return null;
      })
      .filter(Boolean) as GroundingResult['locations'];

    return { text, locations };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "Sorry, I couldn't connect to the navigation AI. Please try again.", 
      locations: [] 
    };
  }
}

export async function getSuggestedPOIs(
  type: 'gas_station' | 'restaurant' | 'car_repair' | 'parking',
  userLocation: { lat: number; lng: number }
): Promise<POI[]> {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Find top 5 ${type.replace('_', ' ')} near my current location. Return their names and map links.`;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
            retrievalConfig: {
                latLng: {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng
                }
            }
        }
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const pois: POI[] = [];
    
    groundingChunks.forEach((chunk: any, index: number) => {
      const data = chunk.maps || chunk.web;
      if (data && data.title) {
        // Since we don't get exact coordinates back easily from the tool in this format,
        // we'll generate some realistic coordinates near the user for the demo.
        // In a real app, we'd use a Places API or parse the map URI.
        const offsetLat = (Math.random() - 0.5) * 0.015;
        const offsetLng = (Math.random() - 0.5) * 0.015;
        
        pois.push({
          id: `poi-${type}-${index}`,
          name: data.title,
          lat: userLocation.lat + offsetLat,
          lng: userLocation.lng + offsetLng,
          type: type,
          address: data.uri
        });
      }
    });

    return pois;
  } catch (error) {
    console.error("Gemini POI Error:", error);
    return [];
  }
}
