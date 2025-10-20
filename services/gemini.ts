
import { GoogleGenAI } from "@google/genai";

// FIX: Initialized GoogleGenAI directly with process.env.API_KEY as per guidelines.
// The API key is assumed to be available in the environment.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
