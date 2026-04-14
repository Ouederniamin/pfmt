declare module "word-extractor" {
  interface Document {
    getBody(): string;
    getHeaders(): string;
    getFootnotes(): string;
  }

  class WordExtractor {
    extract(input: Buffer | string): Promise<Document>;
  }

  export default WordExtractor;
}
