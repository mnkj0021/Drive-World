
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/generate-logo", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
    console.log('API Key available:', !!apiKey);
    
    if (!apiKey) {
      return res.status(500).json({ error: "No API key found" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: 'A minimalist, futuristic cyberpunk logo for an app called "Night Drive". Neon green and black color scheme. Simple, iconic, vector style. Suitable for a favicon.',
            },
          ],
        },
      });

      if (!response.candidates || response.candidates.length === 0) {
        return res.status(500).json({ error: "No candidates in response" });
      }

      const content = response.candidates[0].content;
      if (!content || !content.parts) {
        return res.status(500).json({ error: "No content parts in response" });
      }

      for (const part of content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const buffer = Buffer.from(base64Data, 'base64');
          const outputPath = path.join(process.cwd(), 'public', 'logo.png');
          fs.writeFileSync(outputPath, buffer);
          console.log(`Logo saved to ${outputPath}`);
          return res.json({ success: true, path: '/logo.png' });
        }
      }

      return res.status(500).json({ error: "No image data found in response" });

    } catch (error) {
      console.error('Error generating logo:', error);
      return res.status(500).json({ error: "Error generating logo", details: error });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Check if logo exists, if not generate it
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (!fs.existsSync(logoPath) || fs.statSync(logoPath).size === 0) {
      console.log('Logo not found or empty, generating...');
      try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                  text: 'A minimalist, futuristic cyberpunk logo for an app called "Night Drive". Neon green and black color scheme. Simple, iconic, vector style. Suitable for a favicon.',
                },
              ],
            },
          });
          
          if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts) {
              for (const part of content.parts) {
                if (part.inlineData) {
                  const base64Data = part.inlineData.data;
                  const buffer = Buffer.from(base64Data, 'base64');
                  fs.writeFileSync(logoPath, buffer);
                  console.log(`Logo generated and saved to ${logoPath}`);
                  break;
                }
              }
            }
          }
        } else {
          console.error('No API key found for logo generation');
        }
      } catch (error) {
        console.error('Error generating logo on startup:', error);
      }
    }
  });
}

startServer();
