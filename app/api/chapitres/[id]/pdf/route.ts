import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

export const maxDuration = 60;

const CHROMIUM_REMOTE_URL =
  "https://github.com/nicholasgriffintn/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

async function getBrowser() {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    const paths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
    ];
    let execPath: string | undefined;
    for (const p of paths) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(p)) { execPath = p; break; }
      } catch { /* skip */ }
    }
    return puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: await chromium.executablePath(CHROMIUM_REMOTE_URL),
    headless: true,
  });
}

function buildHtml(titre: string, description: string | null, pages: { titre: string; contenu: string }[], conclusion: string | null): string {
  const pagesSections = pages.map((p, i) => `
    <div class="page-section">
      <h2>${p.titre}</h2>
      <div class="content">${p.contenu}</div>
      ${i < pages.length - 1 ? '<div class="page-break"></div>' : ""}
    </div>
  `).join("");

  const conclusionSection = conclusion ? `
    <div class="page-break"></div>
    <div class="page-section">
      <h2>Conclusion</h2>
      <div class="content"><p>${conclusion.replace(/\n/g, "<br/>")}</p></div>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 50px 45px 50px 45px; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1a1a2e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .title-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 85vh;
      text-align: center;
    }
    .title-page h1 {
      font-size: 28pt;
      font-weight: 700;
      color: #0f4c75;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .title-page .desc {
      font-size: 12pt;
      color: #5a6178;
      max-width: 400px;
    }
    .title-page .badge {
      margin-top: 32px;
      font-size: 9pt;
      color: #c9a96e;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .page-break { page-break-before: always; }
    .page-section { margin-bottom: 24px; }
    .page-section h2 {
      font-size: 16pt;
      font-weight: 700;
      color: #0f4c75;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 2px solid #c9a96e;
    }
    .content { margin-top: 12px; }
    .content p { margin-bottom: 10px; text-align: justify; }
    .content ul, .content ol { margin: 8px 0 8px 24px; }
    .content li { margin-bottom: 4px; }
    .content h3 { font-size: 13pt; color: #0a3554; margin: 16px 0 6px; }
    .content h4 { font-size: 12pt; color: #3282b8; margin: 12px 0 4px; }
    .content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .content th, .content td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
      font-size: 10pt;
    }
    .content th { background: #0f4c75; color: #fff; font-weight: 600; }
    .content strong { color: #0a3554; }
    .content img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${titre}</h1>
    ${description ? `<p class="desc">${description}</p>` : ""}
    <p class="badge">Faculté de Médecine de Tunis — Plateforme Pédagogique</p>
  </div>
  <div class="page-break"></div>
  ${pagesSections}
  ${conclusionSection}
</body>
</html>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const chapitre = await db.chapitre.findUnique({
    where: { id },
    include: { pages: { orderBy: { numero: "asc" } } },
  });

  if (!chapitre) {
    return NextResponse.json({ error: "Chapitre introuvable" }, { status: 404 });
  }

  const html = buildHtml(
    chapitre.titre,
    chapitre.description,
    chapitre.pages,
    chapitre.conclusion
  );

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "50px", bottom: "50px", left: "45px", right: "45px" },
    });

    return new Response(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(chapitre.titre)}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[PDF] Puppeteer error:", error);
    return NextResponse.json(
      { error: "Impossible de générer le PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
