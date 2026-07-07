/**
 * 单元测试脚本：验证核心lib模块
 */
import { planAnnotations } from '../src/lib/annotate/planner.ts';
import { duplicatePdf, renderMergedPdf, renderOverlayPdf } from '../src/lib/pdf/render.ts';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'node:fs';

async function testPlanner() {
  console.log('\n=== 测试 planner ===');
  const questions = [
    { id: 'q1', page: 0, bbox: { x: 0.1, y: 0.2, w: 0.8, h: 0.1 } },
    { id: 'q2', page: 0, bbox: { x: 0.1, y: 0.35, w: 0.8, h: 0.1 } },
    { id: 'q3', page: 0, bbox: { x: 0.1, y: 0.5, w: 0.8, h: 0.1 } },
    { id: 'q4', page: 1, bbox: { x: 0.1, y: 0.2, w: 0.8, h: 0.1 } },
  ];
  const results = [
    { questionId: 'q1', score: 5, maxScore: 5, isCorrect: true, comment: '全对！', errorType: null },
    { questionId: 'q2', score: 0, maxScore: 5, isCorrect: false, comment: '计算错误，请检查乘法口诀。', errorType: 'calculation' },
    { questionId: 'q3', score: 3, maxScore: 5, isCorrect: false, comment: '思路正确但最终答案写错了，下次要仔细检查。', errorType: 'careless' },
    { questionId: 'q4', score: 10, maxScore: 10, isCorrect: true, comment: '解答非常完整！', errorType: null },
  ];
  const anns = planAnnotations({
    questions, results, totalScore: 18, maxScore: 25,
    nameBox: { x: 0.05, y: 0.03, w: 0.35, h: 0.06 },
    pageCount: 2,
  });
  console.log(`生成 ${anns.length} 条批注`);
  const byKind = {};
  for (const a of anns) {
    byKind[a.kind] = (byKind[a.kind] || 0) + 1;
    const pos = `p${a.page} (${a.xPct.toFixed(2)},${a.yPct.toFixed(2)})`;
    const txt = a.text ? ` text="${a.text.slice(0, 20)}"` : '';
    console.log(`  - ${a.kind} ${pos}${txt}`);
  }
  console.log('按类型统计:', byKind);
  const checks = anns.filter(a => a.kind === 'check' && a.color === '#16A34A');
  const crosses = anns.filter(a => a.kind === 'cross' && a.color === '#E11D48');
  const scores = anns.filter(a => a.kind === 'score');
  console.log(`✓ 绿色√: ${checks.length} (期望2: q1,q4对题)`);
  console.log(`✓ 红色×: ${crosses.length} (期望2: q2,q3错题)`);
  console.log(`✓ 分数标记: ${scores.length} (含总分+错题扣分)`);
  if (checks.length !== 2) throw new Error('√数量不对');
  if (crosses.length !== 2) throw new Error('×数量不对');
  return { anns };
}

async function makeTestPdf(pageCount = 2) {
  const src = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const p = src.addPage([595, 842]); // A4
    p.drawText(`Page ${i + 1} - Test Paper`, { x: 50, y: 800, size: 20, color: rgb(0,0,0) });
    p.drawText(`Student answer area...`, { x: 50, y: 700, size: 12, color: rgb(0.2,0.2,0.2) });
  }
  return Buffer.from(await src.save());
}

async function testDuplicatePdf() {
  console.log('\n=== 测试 duplicatePdf（压测大PDF生成）===');
  const srcBuf = await makeTestPdf(2);
  console.log(`源PDF: ${srcBuf.length} bytes, 2页`);

  const t0 = Date.now();
  const N = 20;
  const bigBuf = await duplicatePdf(srcBuf, N);
  const t1 = Date.now();
  console.log(`复制${N}份后: ${bigBuf.length} bytes, 耗时 ${t1-t0}ms`);

  const bigPdf = await PDFDocument.load(bigBuf);
  const pageCount = bigPdf.getPageCount();
  console.log(`大PDF页数: ${pageCount} (期望 ${2*N}=${2*N})`);
  if (pageCount !== 2*N) throw new Error('页数不对！');

  fs.mkdirSync('/tmp/swp-storage', { recursive: true });
  fs.writeFileSync('/tmp/swp-stress-test.pdf', bigBuf);
  console.log(`✓ 已保存到 /tmp/swp-stress-test.pdf`);
  return bigBuf;
}

async function testRenderPdfs() {
  console.log('\n=== 测试 PDF 渲染（merged/overlay）===');
  // 1页测试PDF
  const srcBuf = await makeTestPdf(1);
  const sheet = { pdfBuffer: srcBuf, pageCount: 1 };

  const questions = [
    { id: 'q1', page: 0, bbox: { x: 0.1, y: 0.2, w: 0.8, h: 0.1 } },
  ];
  const results = [
    { questionId: 'q1', score: 0, maxScore: 5, isCorrect: false, comment: '计算错误，要细心哦！', errorType: 'calculation' },
  ];
  const anns = planAnnotations({
    questions, results, totalScore: 0, maxScore: 5,
    nameBox: { x: 0.05, y: 0.03, w: 0.35, h: 0.06 }, pageCount: 1,
  });
  console.log(`plan生成批注数: ${anns.length}`);

  const overlayBuf = await renderOverlayPdf(sheet, anns);
  console.log(`Overlay PDF (白底纯批注): ${overlayBuf.length} bytes`);
  const mergedBuf = await renderMergedPdf(sheet, anns);
  console.log(`Merged PDF (原卷+批注): ${mergedBuf.length} bytes`);

  const overlayPdf = await PDFDocument.load(overlayBuf);
  const mergedPdf = await PDFDocument.load(mergedBuf);
  console.log(`✓ Overlay 页数: ${overlayPdf.getPageCount()}`);
  console.log(`✓ Merged 页数: ${mergedPdf.getPageCount()}`);

  fs.writeFileSync('/tmp/swp-overlay.pdf', overlayBuf);
  fs.writeFileSync('/tmp/swp-merged.pdf', mergedBuf);
  console.log('✓ 保存到 /tmp/swp-overlay.pdf 和 /tmp/swp-merged.pdf');
}

async function main() {
  try {
    await testPlanner();
    await testDuplicatePdf();
    await testRenderPdfs();
    console.log('\n=== 全部单元测试通过 ✅ ===');
  } catch (e) {
    console.error('\n❌ 测试失败:', e);
    process.exit(1);
  }
}
main();
