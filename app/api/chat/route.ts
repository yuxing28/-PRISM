import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, buildUserProfilePrompt, type DecisionMode } from '@/lib/prompts';

const API_URL = "https://api.deepseek.com/chat/completions";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, isDebateMode, decisionMode = 'standard', userMemory, apiKey: clientApiKey } = await req.json();
    const API_KEY = clientApiKey || process.env.DEEPSEEK_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({
        error: "APIKeyMissing",
        details: "请先在右上角 ⚙️ 设置中填入您的 DeepSeek API Key。"
      }, { status: 401 });
    }

    let systemPrompt = getSystemPrompt(decisionMode as DecisionMode, isDebateMode);

    if (userMemory && userMemory.decisionStyle !== 'unknown') {
      const userProfileSection = buildUserProfilePrompt(userMemory);
      systemPrompt = userProfileSection + '\n\n' + systemPrompt;
    }

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const upstreamText = await response.text().catch(() => '');
      console.error("DeepSeek upstream error:", response.status, upstreamText);
      let publicMessage = "服务暂时不可用，请稍后重试。";
      if (response.status === 401) {
        publicMessage = "API Key 无效或已过期，请检查设置中的 DeepSeek Key。";
      } else if (response.status === 429) {
        publicMessage = "上游服务繁忙，请稍后重试。";
      } else if (response.status === 402 || /insufficient|quota|balance/i.test(upstreamText)) {
        publicMessage = "API Key 余额不足，请检查您的 DeepSeek 账户。";
      }
      return NextResponse.json({
        error: "UpstreamError",
        details: publicMessage
      }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }
    });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({
      error: "InternalError",
      details: "服务异常，请稍后重试。"
    }, { status: 500 });
  }
}
