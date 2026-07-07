import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'node:fs';

async function makeStudentPages(doc, font, name, no) {
  const W = 595, H = 842;
  const p1 = doc.addPage([W, H]);
  p1.drawRectangle({ x: 40, y: H-60, width: 300, height: 40, borderColor: rgb(0,0,0), borderWidth: 1 });
  p1.drawText(`Name: ${name}    No: ${no}`, { x: 50, y: H-45, size: 14, font });
  p1.drawText('Grade 3 Math Final (Front)', { x: 200, y: H-90, size: 14, font });
  const qs1 = [
    {label: 'I. Choice: 1. 1+1=?  A.1  B.2  C.3  D.4', answer: 'Answer: B'},
    {label: 'II. True/False: 2. 2+2=4', answer: 'Answer: True'},
    {label: 'III. Fill blank: 3. 3 x 5 =', answer: 'Answer: 15'},
  ];
  let y = H-140;
  for (const q of qs1) {
    p1.drawText(q.label, {x:50, y, size:12, font});
    y -= 30;
    p1.drawText(q.answer, {x:80, y, size:12, font, color: rgb(0.1,0.1,0.7)});
    y -= 60;
  }
  const p2 = doc.addPage([W, H]);
  p2.drawText('Grade 3 Math Final (Back)', {x:220, y:H-50, size:14, font});
  const qs2 = [
    {label: 'IV. Calc: 12 apples / 3 kids = ?', answer: 'Answer: 4 each'},
    {label: 'V. Rect 8x5cm, perimeter=? area=?', answer: 'Answer: 26cm, 40cm2'},
  ];
  y = H-100;
  for (const q of qs2) {
    p2.drawText(q.label, {x:50, y, size:12, font});
    y -= 40;
    p2.drawText(q.answer, {x:80, y, size:12, font, color: rgb(0.1,0.1,0.7)});
    y -= 100;
  }
}

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const students = [['Alice','2024001'],['Bob','2024002'],['Charlie','2024003']];
  for (const [n,no] of students) await makeStudentPages(doc, font, n, no);
  const buf = await doc.save();
  fs.writeFileSync('/tmp/test-paper.pdf', Buffer.from(buf));
  console.log(`OK: /tmp/test-paper.pdf, ${buf.length} bytes, 6 pages`);
}
main();
