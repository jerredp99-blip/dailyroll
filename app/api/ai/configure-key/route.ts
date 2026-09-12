import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/gemini";

export async function GET() {
  const isConfigured = Boolean(getGeminiApiKey());
  return NextResponse.json({ configured: isConfigured });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = body.apiKey;

    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { error: "API key cannot be blank." },
        { status: 400 }
      );
    }

    const trimmed = apiKey.trim();

    // Verify key by making a lightweight test call
    try {
      const ai = new GoogleGenAI({ apiKey: trimmed });
      await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: "Hello",
        config: { maxOutputTokens: 1 },
      });
    } catch (testErr: any) {
      return NextResponse.json(
        {
          error:
            testErr?.message ||
            "Failed to validate API key with Google AI Studio. Please check the key and try again.",
        },
        { status: 400 }
      );
    }

    // Set in memory for immediate use
    process.env.GEMINI_API_KEY = trimmed;

    // Persist to .env.local
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      let envContent = "";
      try {
        envContent = await fs.readFile(envPath, "utf-8");
      } catch {
        envContent = "";
      }

      if (/^GEMINI_API_KEY=/m.test(envContent)) {
        envContent = envContent.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${trimmed}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${trimmed}\n`;
      }

      await fs.writeFile(envPath, envContent, "utf-8");
    } catch (diskErr) {
      console.warn("Could not persist GEMINI_API_KEY to .env.local file:", diskErr);
    }

    return NextResponse.json({
      success: true,
      message: "Gemini API key configured and activated successfully!",
    });
  } catch (error: any) {
    console.error("Failed to configure Gemini API key:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to configure key" },
      { status: 500 }
    );
  }
}

