export async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v1 tries to read a test PDF on require() — lazy-import avoids build-time issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse");
  const result = await pdfParse(buffer);
  return result.text;
}
