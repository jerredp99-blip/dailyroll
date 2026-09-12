import { GoogleGenAI, Type } from "@google/genai";

// Resolve API key from argument or environment
export const getGeminiApiKey = (customKey?: string): string | null => {
  const key =
    customKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_API_KEY?.trim();

  return key && key.length > 0 ? key : null;
};

// Initialize the Google Gen AI client with GEMINI_API_KEY
export const getGeminiClient = (customKey?: string) => {
  const apiKey = getGeminiApiKey(customKey);
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export type ExtractedBonus = {
  name: string;
  dailyBonus: string;
  siteUrl?: string;
  intervalHours?: number;
  promoCode?: string;
  notes?: string;
};

// JSON Schema for structured extraction of casino bonuses
const bonusExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "Casino or platform name (e.g. WOW Vegas, Pulsz, High 5 Casino)",
    },
    dailyBonus: {
      type: Type.STRING,
      description: "Daily or signup bonus amount (e.g. 1 SC + 10,000 GC, $1.00 daily)",
    },
    siteUrl: {
      type: Type.STRING,
      description: "Website URL or login URL if available",
    },
    intervalHours: {
      type: Type.INTEGER,
      description: "Bonus cooldown or reset interval in hours (default 24 if daily)",
    },
    promoCode: {
      type: Type.STRING,
      description: "Any bonus drop or promo code mentioned",
    },
    notes: {
      type: Type.STRING,
      description: "Key terms, playthrough requirements, or notes",
    },
  },
  required: ["name", "dailyBonus"],
};

function fallbackAdvisorAnswer(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("playthrough") || q.includes("wagering") || q.includes("rollover")) {
    return (
      "🎰 **Sweeps Coin Playthrough Rules:**\n\n" +
      "At almost all reputable US sweepstakes casinos (Stake.us, Crown Coins, WOW Vegas, Pulsz, High 5, McLuck), free daily Sweeps Coins (SC) have a standard **1x playthrough requirement**.\n\n" +
      "• **How it works:** If you collect 1.00 SC for free, you must wager that 1.00 SC once in eligible games before the winnings can be redeemed for real cash or gift cards.\n" +
      "• **Redemption rate:** 1 SC is always valued at $1.00 USD.\n" +
      "• **Minimum redemption:** Typically 50 SC to 100 SC for bank/crypto transfers, or as low as 10-25 SC for gift cards.\n\n" +
      "*(💡 Note: Currently running in offline preview mode. Add your free GEMINI_API_KEY to .env.local to unlock live generative AI.)*"
    );
  }

  if (q.includes("best") || q.includes("highest") || q.includes("top") || q.includes("favorite")) {
    return (
      "⭐ **Top Daily Sweepstakes Casino Bonuses:**\n\n" +
      "1. **Stake.us**: 1.00 SC + 10,000 GC every 24 hours.\n" +
      "2. **Crown Coins**: 0.50 to 1.50 SC daily streak bonus (increases on consecutive days).\n" +
      "3. **High 5 Casino**: 0.50 SC + Diamonds every 4 hours.\n" +
      "4. **WOW Vegas**: 0.30 SC to 1.00 SC daily reward.\n" +
      "5. **Pulsz**: 0.30 SC to 1.00 SC consecutive daily rewards.\n" +
      "6. **McLuck**: 0.20 SC to 2.50 SC daily claim.\n" +
      "7. **Zula / Fortune Coins**: Daily login bonuses with low redemption thresholds.\n\n" +
      "💡 *Tip: Keep them pinned in your Rollcall tracker on Dailyroll so you never miss a reset!*"
    );
  }

  if (
    q.includes("reset") ||
    q.includes("interval") ||
    q.includes("cooldown") ||
    q.includes("time") ||
    q.includes("when")
  ) {
    return (
      "⏰ **Casino Reset Times & Intervals:**\n\n" +
      "Sweepstakes casinos operate on two primary reset models:\n\n" +
      "1. **Rolling 24-Hour Clock:** The timer begins the moment you claim, requiring exactly 24 hours (e.g. Crown Coins, Pulsz, McLuck, Fortune Coins).\n" +
      "2. **Fixed Daily Server Reset:** The bonus resets at a specific server time regardless of when you claimed yesterday:\n" +
      "   • **Stake.us**: 00:00 UTC (8:00 PM EST / 5:00 PM PST)\n" +
      "   • **High 5 Casino**: Every 4 hours for the Diamond/SC counter\n\n" +
      "You can customize each casino's exact reset time in Dailyroll's Rollcall tracker."
    );
  }

  if (q.includes("code") || q.includes("drop") || q.includes("promo")) {
    return (
      "🎁 **Bonus Drops & Promo Codes:**\n\n" +
      "• Casinos like Stake.us and Crown Coins release limited-quantity bonus drop codes on their official Telegram, Discord, and X (Twitter) channels.\n" +
      "• Check Dailyroll's **Drop Codes** feed tab to see live drop codes shared by the community!\n" +
      "• To claim drop codes, go to the casino's Settings or Promotions page and paste the code immediately before maximum claims are reached."
    );
  }

  return (
    "🤖 **Dailyroll Sweepstakes Advisor:**\n\n" +
    `You asked: "${query}"\n\n` +
    "Dailyroll is designed to help you maximize free daily login bonuses, track reset countdowns, and share big wins with the community.\n\n" +
    "🔑 **To enable live conversational AI answers with Google Gemini 2.5 Flash:**\n" +
    "1. Get a free API key at [Google AI Studio](https://aistudio.google.com/)\n" +
    "2. Add `GEMINI_API_KEY=your_key` to your `.env.local` file or configure it in the Assistant modal.\n" +
    "3. Ask any custom question or upload promo screenshots for instant analysis!"
  );
}

function fallbackBonusExtraction(text?: string): ExtractedBonus {
  const content = text || "";

  const KNOWN = [
    { name: "Stake.us", match: /stake/i },
    { name: "Crown Coins", match: /crown\s*coins?/i },
    { name: "WOW Vegas", match: /wow\s*vegas/i },
    { name: "Pulsz", match: /pulsz/i },
    { name: "High 5 Casino", match: /high\s*5/i },
    { name: "McLuck", match: /mcluck/i },
    { name: "Chumba Casino", match: /chumba/i },
    { name: "Fortune Coins", match: /fortune\s*coins?/i },
    { name: "Modo.us", match: /modo/i },
    { name: "Spree", match: /spree/i },
    { name: "RealPrize", match: /real\s*prize/i },
    { name: "Zula Casino", match: /zula/i },
  ];

  let detectedName = "Social Casino Offer";
  for (const k of KNOWN) {
    if (k.match.test(content)) {
      detectedName = k.name;
      break;
    }
  }

  const bonusMatch = content.match(
    /(\d+(\.\d+)?\s*(SC|Sweeps Coins?|FREE SC|\$|GC|Gold Coins?)[^\n,\.]*)/i
  );
  const dailyBonus = bonusMatch ? bonusMatch[0].trim() : "Daily Login Bonus";

  const codeMatch = content.match(/(?:code|promo|drop|use code)[:\s]+([A-Z0-9_-]{3,20})/i);
  const promoCode = codeMatch ? codeMatch[1].trim().toUpperCase() : undefined;

  const hoursMatch = content.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
  const intervalHours = hoursMatch ? parseInt(hoursMatch[1], 10) : 24;

  return {
    name: detectedName,
    dailyBonus,
    intervalHours,
    promoCode,
    notes:
      "Extracted via built-in pattern recognition. For full multimodal AI parsing, add your free GEMINI_API_KEY.",
  };
}

/**
 * Extract bonus information from text or promo screenshots using Gemini 2.5 Flash
 */
export async function extractBonusFromContent(params: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  apiKey?: string;
}): Promise<ExtractedBonus> {
  const ai = getGeminiClient(params.apiKey);
  if (!ai) {
    return fallbackBonusExtraction(params.text);
  }

  const contents: any[] = [];

  if (params.imageBase64 && params.mimeType) {
    contents.push({
      inlineData: {
        data: params.imageBase64,
        mimeType: params.mimeType,
      },
    });
  }

  if (params.text) {
    contents.push({ text: params.text });
  }

  contents.push({
    text: "Extract the sweepstakes casino bonus details from the provided input into the structured JSON schema. If the reset interval is unknown, assume 24 hours.",
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: bonusExtractionSchema,
        systemInstruction:
          "You are an expert sweepstakes casino and bonus tracking assistant. Analyze promo emails, bonus codes, screenshots, and terms, extracting exact bonus amounts (SC/GC) and reset intervals accurately.",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.warn("Gemini extraction failed, using fallback:", err);
    return fallbackBonusExtraction(params.text);
  }
}

/**
 * Ask the Bonus Advisor a question about sweepstakes bonuses, strategies, or terms
 */
export async function askBonusAdvisor(
  userQuery: string,
  userCasinosContext?: string,
  apiKey?: string
): Promise<string> {
  const ai = getGeminiClient(apiKey);
  if (!ai) {
    return fallbackAdvisorAnswer(userQuery);
  }

  let prompt = userQuery;
  if (userCasinosContext) {
    prompt = `User's tracked bonuses context:\n${userCasinosContext}\n\nUser Question: ${userQuery}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are the Dailyroll AI Bonus Advisor. You help users maximize their daily sweepstakes casino bonuses (Sweeps Coins / Gold Coins), understand reset times, playthrough requirements (typically 1x SC), and redemption rules. Be concise, actionable, and friendly.",
      },
    });

    return response.text || "";
  } catch (err) {
    console.warn("Gemini askBonusAdvisor call failed, using fallback:", err);
    return fallbackAdvisorAnswer(userQuery);
  }
}
