import fs from "fs/promises";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content/legal");

export async function getLegalContent(
  doc: "terms" | "privacy",
  locale: string,
): Promise<string> {
  const file = path.join(CONTENT_DIR, `${doc}.${locale}.md`);
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    // Fallback to English
    return await fs.readFile(
      path.join(CONTENT_DIR, `${doc}.en.md`),
      "utf-8",
    );
  }
}
