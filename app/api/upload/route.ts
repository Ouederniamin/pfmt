import { NextResponse } from "next/server";
import { extractWord } from "@/lib/extract-word";
import { extractDoc } from "@/lib/extract-doc";
import { ocrPdf } from "@/lib/pdf-ocr";
import { requireAdmin } from "@/lib/auth";

export const maxDuration = 60;

type SommaireEntry = { titre: string; page: number };

/**
 * Extract headings from PDF text per-page.
 */
function extractHeadings(textPerPage: string[]): SommaireEntry[] {
  const headings: SommaireEntry[] = [];
  const seen = new Set<string>();

  // Matches "1. Titre", "2.3 Sous-titre", "IV. Titre", "5.2.1 Details"
  const numberedPattern = /^\s*((?:\d+(?:\.\d+)*\.?\s+|\b[IVXLC]+\.\s+).{3,120})$/;
  const uppercasePattern = /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ\s\d.:,\-–—()]{5,120}$/;

  for (let pageIdx = 0; pageIdx < textPerPage.length; pageIdx++) {
    const pageText = textPerPage[pageIdx];
    const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      const numberedMatch = line.match(numberedPattern);
      if (numberedMatch) {
        const titre = numberedMatch[1].trim();
        const key = titre.toLowerCase().replace(/\s+/g, " ");
        if (!seen.has(key) && titre.length > 3) {
          seen.add(key);
          headings.push({ titre, page: pageIdx + 1 });
        }
        continue;
      }

      if (uppercasePattern.test(line) && line.length >= 8) {
        // Skip classification codes, abbreviations, short labels
        if (/^\(.*\)$/.test(line)) continue;                    // "(LSIL)", "(HSIL)"
        if (/^[IVXLC\d]+$/i.test(line.replace(/\s/g, ""))) continue; // "IIIC1"
        if (!/\s/.test(line)) continue;                          // single word like "MACROSCOPIE"
        if (/^\d+$/.test(line) || /^page\s+\d+/i.test(line)) continue;
        const key = line.toLowerCase().replace(/\s+/g, " ");
        if (!seen.has(key)) {
          seen.add(key);
          headings.push({ titre: line, page: pageIdx + 1 });
        }
      }
    }
  }

  return headings;
}

/**
 * Strip HTML tags and decode entities to get clean plain text.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Validate that a URL belongs to UploadThing (SSRF protection).
 */
function isAllowedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith("utfs.io") || hostname.endsWith("ufs.sh");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    let buffer: Buffer;
    let name: string;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // URL-based: download file from UploadThing
      const body = await req.json();
      const { url, fileName } = body as { url?: string; fileName?: string };
      if (!url || !fileName) {
        return NextResponse.json({ error: "URL et nom de fichier requis." }, { status: 400 });
      }
      if (!isAllowedUrl(url)) {
        return NextResponse.json({ error: "URL non autorisée." }, { status: 403 });
      }
      const fileRes = await fetch(url);
      if (!fileRes.ok) {
        return NextResponse.json({ error: "Impossible de télécharger le fichier." }, { status: 502 });
      }
      buffer = Buffer.from(await fileRes.arrayBuffer());
      name = fileName.toLowerCase();
    } else {
      // FormData: direct file upload (small files only)
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
      }
      if (file.size > 32 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Fichier trop volumineux (max 32 Mo)." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await file.arrayBuffer());
      name = file.name.toLowerCase();
    }

    let rawText = "";
    let sommaire: SommaireEntry[] = [];
    let totalPages = 1;

    if (name.endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse");

      // Collect per-page text via custom pagerender
      const textPerPage: string[] = [];
      const result = await pdfParse(buffer, {
        pagerender: function (pageData: any) {
          return pageData
            .getTextContent({ normalizeWhitespace: false })
            .then((textContent: any) => {
              let lastY: number | null = null;
              let text = "";
              for (const item of textContent.items) {
                const y = item.transform ? item.transform[5] : null;
                if (lastY !== null && y !== lastY) {
                  text += "\n";
                }
                text += item.str;
                lastY = y;
              }
              textPerPage.push(text);
              return text;
            });
        },
      });

      const fullText: string = result.text ?? "";
      // If pagerender didn't populate (some PDFs), fall back to form-feed split
      let pages: string[];
      if (textPerPage.length > 1) {
        pages = textPerPage;
      } else {
        const ffSplit = fullText.split(/\f/).filter((t: string) => t.trim());
        pages = ffSplit.length > 1 ? ffSplit : [fullText];
      }

      rawText = fullText;
      sommaire = extractHeadings(pages);
      totalPages = result.numpages ?? pages.length;

      // Fallback: image-based PDF → OCR via puppeteer + Azure OpenAI
      // Trigger OCR if extracted text is too sparse (< ~50 words for a multi-page doc)
      const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
      const isImageBased = !rawText.trim() || (totalPages > 2 && wordCount < 50);
      if (isImageBased) {
        const ocr = await ocrPdf(buffer);
        rawText = ocr.rawText;
        totalPages = ocr.totalPages || totalPages;
        // Re-extract headings from OCR text (split by double newlines as "pages")
        const ocrPages = rawText.split(/\n\n+/).filter(t => t.trim());
        sommaire = extractHeadings(ocrPages.length > 1 ? ocrPages : [rawText]);
      }
    } else if (name.endsWith(".docx")) {
      const html = await extractWord(buffer);
      rawText = htmlToPlainText(html);
    } else if (name.endsWith(".doc")) {
      rawText = await extractDoc(buffer);
    } else {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez .doc, .docx ou .pdf" },
        { status: 400 }
      );
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "Aucun texte extrait du fichier. Vérifiez que le fichier contient du texte." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      sommaire,
      fileName: name,
      totalPages,
      rawText,
    });
  } catch (_error) {
    console.error("[Upload] Error:", _error);
    return NextResponse.json(
      { error: "Erreur lors de l'extraction." },
      { status: 500 }
    );
  }
}
