import { NextResponse } from 'next/server';

// 测试哪个视觉模型可用
const TEST_MODELS = [
  // Qwen3-VL 系列（最新收费模型）
  'Qwen/Qwen3-VL-235B-A22B-Instruct',
  'Qwen/Qwen3-VL-35B-A3B-Instruct',
  'Qwen/Qwen3-VL-8B-Instruct',
  'Qwen/Qwen3-VL-4B-Instruct',
  // Qwen2.5-VL
  'Qwen/Qwen2.5-VL-72B-Instruct',
  'Qwen/Qwen2.5-VL-32B-Instruct',
  'Qwen/Qwen2.5-VL-7B-Instruct',
  'Qwen/Qwen2.5-VL-3B-Instruct',
  // Qwen2-VL
  'Qwen/Qwen2-VL-72B-Instruct',
  'Qwen/Qwen2-VL-7B-Instruct',
  // 其他
  'deepseek-ai/Janus-Pro-7B',
  'deepseek-ai/DeepSeek-VL2',
  'THUDM/GLM-4.1V-9B-Thinking',
  'Qwen/QVQ-72B-Preview',
  'StepFun/step1o-vision',
  'FunAudioLLM/Florence-2-large',
  'iic/SenseVoiceSmall-Vision',
];

// 1x1透明PNG
const TINY_IMG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export async function GET() {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'no api key' });

  const results: any[] = [];
  for (const model of TEST_MODELS) {
    try {
      const t0 = Date.now();
      const resp = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: '这是什么？仅回复一个字。' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${TINY_IMG_B64}`, detail: 'low' } },
            ],
          }],
          max_tokens: 5,
          temperature: 0.1,
        }),
      });
      const text = await resp.text();
      let ok = false;
      let answer = '';
      try {
        const data = JSON.parse(text);
        answer = data.choices?.[0]?.message?.content || '';
        ok = resp.ok && !!answer;
      } catch {}
      results.push({
        model, status: resp.status, ok, answer: answer.slice(0, 50),
        ms: Date.now() - t0,
        err: resp.ok ? undefined : text.slice(0, 150),
      });
      console.log(`[test-vl] ${model}: ${resp.status} ${answer.slice(0, 30) || text.slice(0, 80)}`);
    } catch (e: any) {
      results.push({ model, ok: false, err: e.message });
    }
  }

  return NextResponse.json({ results });
}
