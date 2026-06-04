import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, buildUserProfilePrompt, type DecisionMode } from '@/lib/prompts';
import { verifyTurnstile, isTurnstileConfigured } from '@/lib/turnstile';
import { checkRateLimit } from '@/lib/rate-limit';

const API_URL = "https://api.deepseek.com/chat/completions";

export const runtime = 'edge';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { messages, isDebateMode, decisionMode = 'standard', userMemory, apiKey: clientApiKey, turnstileToken } = await req.json();
    const API_KEY = clientApiKey || process.env.DEEPSEEK_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({
        error: "APIKeyMissing",
        details: "服务端未配置 DeepSeek API Key，且您也未在设置中配置个人 Key。请点击右上角 ⚙️ 设置 → 填入您的 DeepSeek API Key。"
      }, { status: 401 });
    }

    const isUserPaid = !!clientApiKey;
    const turnstileActive = isTurnstileConfigured();

    if (!isUserPaid) {
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return NextResponse.json({
          error: "RateLimited",
          details: `今日 ${rl.limit} 次免费体验已用完。配置您自己的 DeepSeek API Key 即可无限使用：点击右上角 ⚙️ → 填入您的 key。`,
          limit: rl.limit,
          remaining: 0,
          resetAt: rl.resetAt,
        }, {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
          }
        });
      }
    }

    if (!isUserPaid && turnstileActive) {
      if (!turnstileToken) {
        return NextResponse.json({
          error: "TurnstileRequired",
          details: "请等待人机验证完成后重试。"
        }, { status: 403 });
      }
      const verify = await verifyTurnstile(turnstileToken, ip);
      if (!verify.success) {
        return NextResponse.json({
          error: "TurnstileFailed",
          details: "人机验证失败，请刷新页面后重试。"
        }, { status: 403 });
      }
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
        publicMessage = "服务端 API Key 余额不足，请联系管理员或在设置中填入您自己的 Key。";
      }
      return NextResponse.json({
        error: "UpstreamError",
        details: publicMessage
      }, { status: 502 });
    }

    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };
    if (!isUserPaid) {
      const rl = checkRateLimit(ip);
      headers["X-RateLimit-Limit"] = String(rl.limit);
      headers["X-RateLimit-Remaining"] = String(rl.remaining);
      headers["X-RateLimit-Reset"] = String(Math.floor(rl.resetAt / 1000));
    }

    return new Response(response.body, { headers });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({
      error: "InternalError",
      details: "服务异常，请稍后重试。"
    }, { status: 500 });
  }
}
