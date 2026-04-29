/**
 * 测试环境配置
 * 基于Jest + TypeScript
 */

import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom'; // 添加 jest-dom 匹配器

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;

// 设置测试超时（DeepSeek API可能需要较长时间）
jest.setTimeout(60000); // 60秒

// 全局测试配置
export const TEST_CONFIG = {
  // DeepSeek API Key（从环境变量读取）
  API_KEY: process.env.TEST_API_KEY || process.env.DEEPSEEK_API_KEY || '',
  API_TIMEOUT: 30000,
  MAX_RETRIES: 2,
  // 是否跳过实际API调用（用于快速测试）
  MOCK_MODE: process.env.MOCK_MODE === 'true',
};

// 环境变量检查
if (!TEST_CONFIG.API_KEY) {
  if (TEST_CONFIG.MOCK_MODE) {
    console.log('📌 Mock模式：跳过API调用');
  } else {
    console.warn('⚠️  未配置 API Key，请设置 TEST_API_KEY 或 DEEPSEEK_API_KEY 环境变量');
    console.warn('   或者使用 Mock 模式：npm run test:mock');
  }
} else {
  console.log('✅ API Key 已配置');
}

console.log('🧪 测试环境初始化完成');
console.log(`   Mock模式: ${TEST_CONFIG.MOCK_MODE ? '开启' : '关闭'}`);
console.log(`   API Key: ${TEST_CONFIG.API_KEY ? '已配置' : '未配置'}`);
