/**
 * SSE 流式解析模块
 * 处理 Server-Sent Events 流，分离可见文本和 JSON 数据块
 */

import type { Message } from '@/lib/store';

const JSON_START_MARKER_REGEX = /JSON_DATA_START|___\*{0,2}JSON_BLOCK_START\*{0,2}___/;
const GUARD_LEN = 'JSON_DATA_START'.length - 1;

interface StreamCallbacks {
    onFirstChunk?: (text: string) => void;
    onChunk?: (text: string) => void;
}

/**
 * 解析 SSE 流并分离可见文本
 * @returns 完整的 AI 回复文本（包含可能的 JSON 块）
 */
export async function readSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: StreamCallbacks
): Promise<string> {
    const decoder = new TextDecoder();
    let fullResponseText = "";
    let isCollectingJSON = false;
    let pendingVisible = "";
    let sseBuffer = "";
    let isFirstChunk = true;

    const emitVisible = (text: string) => {
        if (!text) return;
        if (isFirstChunk) {
            callbacks.onChunk?.(text);
            isFirstChunk = false;
        } else {
            callbacks.onChunk?.(text);
        }
    };

    const processSSELine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) return;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (!content) return;

            fullResponseText += content;
            if (isCollectingJSON) return;

            pendingVisible += content;

            const markerIndex = pendingVisible.search(JSON_START_MARKER_REGEX);
            if (markerIndex !== -1) {
                const visiblePart = pendingVisible.slice(0, markerIndex);
                emitVisible(visiblePart);
                pendingVisible = "";
                isCollectingJSON = true;
                return;
            }

            if (pendingVisible.length > GUARD_LEN) {
                const safeLen = pendingVisible.length - GUARD_LEN;
                const safePart = pendingVisible.slice(0, safeLen);
                emitVisible(safePart);
                pendingVisible = pendingVisible.slice(safeLen);
            }
        } catch {
            // 忽略单行解析错误
        }
    };

    // 主循环：读取流数据
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        while (true) {
            const newlineIndex = sseBuffer.indexOf('\n');
            if (newlineIndex === -1) break;
            const rawLine = sseBuffer.slice(0, newlineIndex);
            sseBuffer = sseBuffer.slice(newlineIndex + 1);
            processSSELine(rawLine);
        }
    }

    // 处理剩余缓冲
    sseBuffer += decoder.decode();
    if (sseBuffer.trim().length > 0) {
        for (const rawLine of sseBuffer.split('\n')) {
            processSSELine(rawLine);
        }
    }

    if (!isCollectingJSON && pendingVisible) {
        emitVisible(pendingVisible);
    }

    return fullResponseText;
}
