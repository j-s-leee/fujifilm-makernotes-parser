import OpenAI from "openai";

const NON_ASCII_REGEX = /[^\x00-\x7F]/;

/**
 * Translate any non-English text to a concise English description
 * optimized for CLIP text embedding similarity search.
 * Returns the original text unchanged if it's already ASCII-only.
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!NON_ASCII_REGEX.test(text)) {
    return text;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, skipping translation");
    return text;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Translate the user's text into English. The result will be used as a CLIP text embedding query to find visually similar photos. Output a concise, descriptive English phrase that captures the visual meaning. Return ONLY the English text, nothing else.",
        },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 256,
    });

    const translated = response.choices[0]?.message?.content?.trim();
    if (!translated) {
      console.error("Empty translation response");
      return text;
    }

    return translated;
  } catch (error) {
    console.error("Translation failed:", error);
    return text;
  }
}
