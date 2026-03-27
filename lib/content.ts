import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface ContentMeta {
  title: string;
  date?: string;
  summary?: string;
  slug: string;
}

export interface ContentEntry {
  meta: ContentMeta;
  content: string;
}

export function getContent(
  section: "changelog" | "guide",
  slug: string,
  locale: string,
): ContentEntry | null {
  const dir = path.join(CONTENT_DIR, section);
  const localePath = path.join(dir, `${slug}.${locale}.md`);
  const fallbackPath = path.join(dir, `${slug}.en.md`);

  const filePath = fs.existsSync(localePath) ? localePath : fallbackPath;
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    meta: {
      title: data.title ?? slug,
      date: data.date ?? undefined,
      summary: data.summary ?? undefined,
      slug,
    },
    content,
  };
}

export function listContent(
  section: "changelog" | "guide",
  locale: string,
): ContentMeta[] {
  const dir = path.join(CONTENT_DIR, section);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const slugs = new Set<string>();
  for (const file of files) {
    const match = file.match(/^(.+)\.(en|ko)\.md$/);
    if (match) slugs.add(match[1]);
  }

  const entries: ContentMeta[] = [];
  for (const slug of slugs) {
    const entry = getContent(section, slug, locale);
    if (entry) entries.push(entry.meta);
  }

  if (section === "changelog") {
    entries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  } else {
    entries.sort((a, b) => a.title.localeCompare(b.title));
  }

  return entries;
}

export function getAllSlugs(section: "changelog" | "guide"): string[] {
  const dir = path.join(CONTENT_DIR, section);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const slugs = new Set<string>();
  for (const file of files) {
    const match = file.match(/^(.+)\.(en|ko)\.md$/);
    if (match) slugs.add(match[1]);
  }
  return Array.from(slugs);
}
