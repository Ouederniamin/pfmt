import { generateText } from "ai";
import { getAzureModel } from "@/lib/azure-ai";
import { getBrowser } from "@/lib/browser";

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";

/**
 * OCR for image-based PDFs: renders pages via puppeteer + pdf.js,
 * then sends page images to Azure OpenAI for text extraction.
 * Processes pages in parallel batches for speed.
 */
export async function ocrPdf(buffer: Buffer): Promise<{
  rawText: string;
  totalPages: number;
}> {
  const browser = await getBrowser();
  try {
    // 1) Render PDF pages to JPEG images using pdf.js inside the browser
    const page = await browser.newPage();
    const html = `<!DOCTYPE html>
<html><head>
<script src="${PDFJS_CDN}/pdf.min.js"></script>
</head><body><canvas id="c"></canvas></body></html>`;
    await page.setContent(html, { waitUntil: "networkidle0" });

    const b64 = buffer.toString("base64");
    const workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;

    const images: string[] = await page.evaluate(
      async (pdfData: string, pdfWorkerSrc: string) => {
        // @ts-expect-error pdf.js loaded globally via script tag
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
        const data = Uint8Array.from(atob(pdfData), (c) => c.charCodeAt(0));
        // @ts-expect-error pdf.js loaded globally
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const canvas = document.getElementById("c") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d")!;
        const results: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i);
          const vp = pg.getViewport({ scale: 1.5 });
          canvas.width = vp.width;
          canvas.height = vp.height;
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          // Strip data:image/jpeg;base64, prefix
          results.push(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        }
        return results;
      },
      b64,
      workerSrc
    );

    await page.close();

    const totalPages = images.length;
    if (totalPages === 0) return { rawText: "", totalPages: 0 };

    // 2) Send page images to Azure OpenAI in parallel batches
    const model = getAzureModel();
    const BATCH_SIZE = 5;
    const batches: string[][] = [];
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      batches.push(images.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const content: Array<
          | { type: "image"; image: Buffer; mimeType: "image/jpeg" }
          | { type: "text"; text: string }
        > = [];
        for (const img of batch) {
          content.push({
            type: "image",
            image: Buffer.from(img, "base64"),
            mimeType: "image/jpeg",
          });
        }
        content.push({
          type: "text",
          text: `Extrais TOUT le texte visible de ces ${batch.length} pages de cours médical. Retourne UNIQUEMENT le texte brut complet. Préserve titres, listes, paragraphes. Sépare chaque page par une ligne vide.`,
        });

        const result = await generateText({
          model,
          messages: [{ role: "user", content }],
        });
        return result.text;
      })
    );

    const rawText = batchResults.join("\n\n");
    return { rawText, totalPages };
  } finally {
    await browser.close();
  }
}
