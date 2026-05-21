import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, driverImageBase64 } = await req.json();

    if (!imageBase64 || !driverImageBase64) {
      return NextResponse.json({ error: "Missing images for comparison" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
       // Mock fallback if AI key missing
       return NextResponse.json({ match: true, confidence: "low", reason: "AI Key missing, auto-approved" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Convert base64 to data parts (removing data URI preamble like "data:image/jpeg;base64,")
    const processBase64 = (b64: string) => {
      const parts = b64.split(",");
      return parts.length > 1 ? parts[1] : parts[0];
    }
    
    const imagePart1 = {
      inlineData: {
        data: processBase64(imageBase64),
        mimeType: "image/jpeg"
      }
    };
    
    const imagePart2 = {
      inlineData: {
        data: processBase64(driverImageBase64),
        mimeType: "image/jpeg"
      }
    };

    const prompt = `You are a biometric security system. Carefully compare the faces in the two images provided.
    Determine if they belong to the same person.
    
    Respond STRICTLY in the following JSON format:
    {
      "match": true or false,
      "confidence": "high" or "low",
      "reason": "Brief explanation of why they do or do not match."
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [prompt, imagePart1, imagePart2],
    });
    
    const text = response.text || "{}";
    // Parse json between ```json and ``` if needed
    const jsonMatch = text.match(/```json\n([\s\S]*)\n```/) || text.match(/```([\s\S]*)```/);
    const parseableText = jsonMatch ? jsonMatch[1] : text;
    
    let result;
    try {
      result = JSON.parse(parseableText);
    } catch(e) {
      // Fallback simple search
      const match = text.toLowerCase().includes('"match": true') || text.toLowerCase().includes('true');
      result = { match, confidence: "low", reason: "Could not properly parse response, fallback heuristic used." };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Face verification error:", error);
    return NextResponse.json({ error: "Failed to verify face", match: false }, { status: 500 });
  }
}
