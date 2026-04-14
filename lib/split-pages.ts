type SplitPage = {
  numero: number;
  titre: string;
  contenu: string;
};

/**
 * Splits extracted content into logical pages.
 * Strategy:
 *   1. HTML headings (h1-h3) → split on headings
 *   2. Numbered section patterns (I., II., 1., 2., A.) → split on those
 *   3. Double-newline paragraphs → group into ~600-word pages
 *   4. Fallback: split by word count
 */
export function splitPages(raw: string): SplitPage[] {
  if (!raw || !raw.trim()) {
    return [{ numero: 1, titre: "Introduction", contenu: "<p>Aucun contenu extrait.</p>" }];
  }

  // ─── Strategy 1: HTML headings (from Word docs) ───
  const hasHtmlHeadings = /<h[123][^>]*>/i.test(raw);
  if (hasHtmlHeadings) {
    const sections = raw.split(/(?=<h[123][^>]*>)/gi).filter((s) => s.trim());
    if (sections.length > 1) {
      return sections.map((section, i) => {
        const titleMatch = section.match(/<h[123][^>]*>(.*?)<\/h[123]>/i);
        const titre = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || `Section ${i + 1}`;
        return { numero: i + 1, titre, contenu: section };
      });
    }
  }

  // ─── Strategy 2: Numbered/Roman section headings in plain text (from PDFs) ───
  const numberedPattern = /^\s*((?:[IVXLC]+|\d+)\.\s+.{5,80})$/gm;
  const headingMatches = [...raw.matchAll(numberedPattern)];
  if (headingMatches.length >= 2) {
    const pages: SplitPage[] = [];
    for (let i = 0; i < headingMatches.length; i++) {
      const start = headingMatches[i].index!;
      const end = i + 1 < headingMatches.length ? headingMatches[i + 1].index! : raw.length;
      const chunk = raw.slice(start, end).trim();
      const titre = headingMatches[i][1].trim();
      const body = chunk.slice(headingMatches[i][0].length).trim();
      pages.push({
        numero: i + 1,
        titre,
        contenu: body ? `<p>${body.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>` : "<p></p>",
      });
    }
    // Capture any content before the first heading as intro
    const preContent = raw.slice(0, headingMatches[0].index!).trim();
    if (preContent.length > 100) {
      pages.unshift({
        numero: 0,
        titre: "Introduction",
        contenu: `<p>${preContent.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`,
      });
    }
    // Renumber
    return pages.map((p, i) => ({ ...p, numero: i + 1 }));
  }

  // ─── Strategy 3: Paragraph-based grouping ───
  const paragraphs = raw.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length > 2) {
    return groupParagraphsIntoPages(paragraphs);
  }

  // ─── Strategy 4: Word count split ───
  return splitByWordCount(raw);
}

function groupParagraphsIntoPages(
  paragraphs: string[],
  targetWords = 600
): SplitPage[] {
  const pages: SplitPage[] = [];
  let currentChunks: string[] = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length;
    currentChunks.push(para);
    currentWordCount += words;

    if (currentWordCount >= targetWords) {
      pages.push(makePage(currentChunks, pages.length + 1));
      currentChunks = [];
      currentWordCount = 0;
    }
  }

  if (currentChunks.length > 0) {
    pages.push(makePage(currentChunks, pages.length + 1));
  }

  return pages.length > 0
    ? pages
    : [{ numero: 1, titre: "Introduction", contenu: "<p>Aucun contenu.</p>" }];
}

function makePage(chunks: string[], num: number): SplitPage {
  // Use the first non-trivial line as title
  const firstLine = chunks[0].split("\n")[0].trim();
  const titre =
    firstLine.length > 10 && firstLine.length < 120
      ? firstLine
      : `Section ${num}`;

  const html = chunks
    .map((c) => `<p>${c.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return { numero: num, titre, contenu: html };
}

function splitByWordCount(text: string, wordsPerPage = 600): SplitPage[] {
  const words = text.split(/\s+/).filter(Boolean);
  const pages: SplitPage[] = [];

  for (let i = 0; i < words.length; i += wordsPerPage) {
    const chunk = words.slice(i, i + wordsPerPage).join(" ");
    pages.push({
      numero: pages.length + 1,
      titre: `Page ${pages.length + 1}`,
      contenu: `<p>${chunk}</p>`,
    });
  }

  return pages.length > 0
    ? pages
    : [{ numero: 1, titre: "Introduction", contenu: "<p>Aucun contenu.</p>" }];
}
