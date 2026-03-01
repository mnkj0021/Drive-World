import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title) // Maps tool often returns web chunks with map URIs
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
        // Note: The API might not return direct lat/lng in chunks, 
        // we might need to rely on the URI or text parsing in a real scenario.
        // For this demo, we'll try to extract from text or mock if needed for the UI.
      }));

    return { text, locations };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "Sorry, I couldn't connect to the navigation AI. Please try again.", 
      locations: [] 
    };
  }
}
