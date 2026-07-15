// @types/pdf-parse описывает только вход-точку "pdf-parse", а мы импортируем
// "pdf-parse/lib/pdf-parse.js" напрямую (см. text-extractor.ts) в обход debug-режима index.js.
declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<{ text: string; numpages: number }>;
  export = pdfParse;
}
