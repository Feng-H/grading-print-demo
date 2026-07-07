import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';

async function main() {
  const files = process.argv.slice(2);
  for (const f of files) {
    const buf = fs.readFileSync(f);
    const pdf = await PDFDocument.load(buf);
    const pages = pdf.getPageCount();
    const name = f.split('/').pop();
    console.log(`${name}: ${buf.length} bytes, ${pages} pages, ✓ valid`);
  }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
