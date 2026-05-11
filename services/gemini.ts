
import { GoogleGenAI } from "@google/genai";

// Use the standard environment variable for the Gemini API key
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined in the environment.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });
