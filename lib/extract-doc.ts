import WordExtractor from "word-extractor";

const extractor = new WordExtractor();

export async function extractDoc(buffer: Buffer): Promise<string> {
  const doc = await extractor.extract(buffer);
  return doc.getBody();
}
