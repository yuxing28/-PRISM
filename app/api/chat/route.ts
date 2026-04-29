import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, buildUserProfilePrompt, type DecisionMode } from '@/lib/prompts';

const API_URL = "https://api.deepseek.com/chat/completions";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const { messages, isDebateMode, decisionMode = 'standard', apiKey: clientApiKey, userMemory } = await req.json();
        const API_KEY = clientApiKey || process.env.DEEPSEEK_API_KEY;

        if (!API_KEY) {
            return NextResponse.json({
                error: "API Key Missing",
                details: "请在用户设置中配置您的 DeepSeek API Key，或者在服务器端配置环境变量。"
            }, { status: 401 });
        }

        // 选择 System Prompt
        let systemPrompt = getSystemPrompt(decisionMode as DecisionMode, isDebateMode);

        // 注入用户画像（如果有）
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
                model: "deepseek-chat",
                messages: fullMessages,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "API Error", details: errorText }, { status: response.status });
        }

        return new Response(response.body, {
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
