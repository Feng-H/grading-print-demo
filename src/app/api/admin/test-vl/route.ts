import { NextResponse } from 'next/server';

// 先拉取官方模型列表，再逐个测试视觉模型
export async function GET() {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'no api key' });

  // 1. 从SiliconFlow API获取所有可用模型
  let allModels: string[] = [];
  try {
    const modelsResp = await fetch('https://api.siliconflow.cn/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const modelsData = await modelsResp.json();
    if (Array.isArray(modelsData.data)) {
      allModels = modelsData.data.map((m: any) => m.id).filter(Boolean);
    }
  } catch (e) {
    console.error('获取模型列表失败', e);
  }

  // 过滤出可能是视觉/VL的模型
  const vlCandidates = allModels.filter(id => {
    const l = id.toLowerCase();
    return (l.includes('vl') || l.includes('vision') || l.includes('janus') ||
            l.includes('internvl') || l.includes('glm-4v') || l.includes('pixtral') ||
            l.includes('llava') || l.includes('llama-3.2-vision') || l.includes('qwen2.5-vl') ||
            l.includes('qwen2-vl') || l.includes('minicpm') || l.includes('gemma-3') ||
            l.includes('phi-3') || l.includes('deepseek-vl') || l.includes('ocr'))
      && !l.includes('nv-embed') && !l.includes('tts') && !l.includes('asr');
  });

  // 加上一些兜底常用的
  const extras = [
    'Qwen/Qwen2.5-VL-72B-Instruct',
    'Qwen/Qwen2.5-VL-32B-Instruct',
    'Qwen/Qwen2.5-VL-7B-Instruct',
    'Qwen/Qwen2.5-VL-3B-Instruct',
    'Qwen/Qwen2-VL-72B-Instruct',
    'Qwen/Qwen2-VL-7B-Instruct',
    'deepseek-ai/Janus-Pro-7B',
    'deepseek-ai/DeepSeek-VL2',
    'Pro/Qwen/Qwen2.5-VL-7B-Instruct',
    'Pro/Qwen/Qwen2.5-VL-72B-Instruct',
    'THUDM/glm-4v-9b',
    'OpenGVLab/InternVL3-8B-Instruct',
  ];
  for (const m of extras) if (!vlCandidates.includes(m)) vlCandidates.push(m);

  // 1x1透明PNG
  const TINY_IMG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const results: any[] = [];
  // 并发测试（分批，避免限流）
  const BATCH = 5;
  for (let i = 0; i < vlCandidates.length; i += BATCH) {
    const batch = vlCandidates.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(async (model) => {
      try {
        const t0 = Date.now();
        const resp = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: [
              { type: 'text', text: '这是一张什么？只回答一个字。' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${TINY_IMG_B64}`, detail: 'low' } },
            ]}],
            max_tokens: 5, temperature: 0.1,
          }),
        });
        const text = await resp.text();
        let answer = '';
        try {
          const d = JSON.parse(text);
          answer = d.choices?.[0]?.message?.content || '';
        } catch {}
        return {
          model,
          status: resp.status,
          ok: resp.ok && !!answer,
          answer: answer.slice(0, 30),
          ms: Date.now() - t0,
          err: resp.ok ? undefined : text.slice(0, 120),
        };
      } catch (e: any) {
        return { model, ok: false, err: e.message };
      }
    }));
    results.push(...batchResults);
    if (i + BATCH < vlCandidates.length) await new Promise(r => setTimeout(r, 500));
  }

  const ok = results.filter(r => r.ok);
  const fail403 = results.filter(r => r.status === 403);
  const fail404 = results.filter(r => r.status === 400 || r.status === 404);

  return NextResponse.json({
    totalModels: allModels.length,
    vlCandidatesTested: vlCandidates.length,
    available: ok.map(r => ({ model: r.model, ms: r.ms, answer: r.answer })),
    needEnable: fail403.map(r => r.model),
    notFound: fail404.length,
    allResults: results,
  });
}
