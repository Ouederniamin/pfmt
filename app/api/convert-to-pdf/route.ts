import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { UTApi } from "uploadthing/server";
import { getBrowser } from "@/lib/browser";
import { requireAdmin } from "@/lib/auth";

const utapi = new UTApi();

// Vercel serverless: allow up to 60s (Pro plan)
export const maxDuration = 60;

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 40px 35px; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 22pt; color: #0f4c75; margin: 0 0 12px; }
    h2 { font-size: 16pt; color: #0f4c75; margin: 18px 0 8px; border-bottom: 2px solid #c9a96e; padding-bottom: 4px; }
    h3 { font-size: 13pt; color: #0a3554; margin: 14px 0 6px; }
    h4 { font-size: 12pt; color: #3282b8; margin: 10px 0 4px; }
    p { margin: 0 0 8px; text-align: justify; }
    ul, ol { margin: 6px 0 6px 20px; }
    li { margin-bottom: 3px; }
    a { color: #0f4c75; text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 5px 7px; font-size: 10pt; text-align: left; }
    th { background: #0f4c75; color: #fff; font-weight: 600; }
    strong { color: #0a3554; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${body}</body>
</html>`;
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

  let browser;
  try {
    let buffer: Buffer;
    let name: string;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // URL-based: download file from UploadThing
      const body = await req.json();
      const { url, fileName } = body as { url?: string; fileName?: string };
      if (!url) {
        return NextResponse.json({ error: "URL requise." }, { status: 400 });
      }
      if (!isAllowedUrl(url)) {
        return NextResponse.json({ error: "URL non autorisée." }, { status: 403 });
      }
      const fileRes = await fetch(url);
      if (!fileRes.ok) {
        return NextResponse.json({ error: "Impossible de télécharger le fichier." }, { status: 502 });
      }
      buffer = Buffer.from(await fileRes.arrayBuffer());
      name = (fileName || url.split("/").pop() || "document.docx").toLowerCase();
    } else {
      // FormData: direct file upload (small files only)
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
      }
      name = file.name.toLowerCase();
      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (!name.endsWith(".docx") && !name.endsWith(".doc")) {
      return NextResponse.json(
        { error: "Seuls les fichiers Word (.doc, .docx) sont acceptés." },
        { status: 400 }
      );
    }

    let htmlBody: string;

    if (name.endsWith(".docx")) {
      const result = await mammoth.convertToHtml({
        buffer,
        convertImage: mammoth.images.imgElement((image: any) =>
          image.read("base64").then((data: string) => ({
            src: `data:${image.contentType};base64,${data}`,
          }))
        ),
      } as Parameters<typeof mammoth.convertToHtml>[0]);
      htmlBody = result.value;
    } else {
      // .doc — use word-extractor for plain text then wrap
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WordExtractor = require("word-extractor");
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      const text: string = doc.getBody();
      htmlBody = text
        .split("\n")
        .map((line: string) => (line.trim() ? `<p>${line}</p>` : ""))
        .join("");
    }

    const fullHtml = wrapHtml(htmlBody);

    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "40px", bottom: "40px", left: "35px", right: "35px" },
    });

    const pdfName = name.replace(/\.(docx?|doc)$/i, ".pdf");

    // JSON request: upload PDF server-side via UTApi and return URL (no blob roundtrip)
    if (contentType.includes("application/json")) {
      const pdfBuf = Buffer.from(pdfBuffer);
      const blob = new Blob([pdfBuf], { type: "application/pdf" });
      const uploadFile = new File([blob], pdfName, { type: "application/pdf" });
      const uploaded = await utapi.uploadFiles(uploadFile);
      if (uploaded.error) {
        return NextResponse.json({ error: "Échec de l'upload du PDF converti." }, { status: 500 });
      }
      return NextResponse.json({ url: uploaded.data.ufsUrl, name: pdfName });
    }

    // FormData request: return raw PDF (backwards compatible)
    return new Response(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(pdfName)}"`,
      },
    });
  } catch (error) {
    console.error("[ConvertPDF] Error:", error);
    return NextResponse.json(
      { error: "Impossible de convertir le fichier en PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
