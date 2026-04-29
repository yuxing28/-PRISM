/**
 * Prompt 模块统一导出入口
 *
 * 使用方式：
 *   import { COMMON_PREFIX, getSystemPrompt, buildUserProfilePrompt } from '@/lib/prompts';
 */

export { COMMON_PREFIX } from './common';
export { JSON_INSTRUCTION, JSON_REMINDER, INFO_COLLECTION_GUARD, STYLE_ENFORCEMENT } from './json-instruction';
export { PROMPTS, getSystemPrompt, type DecisionMode } from './modes';
export { buildUserProfilePrompt } from './user-profile';
