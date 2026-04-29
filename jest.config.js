/** @type {import('jest').Config} */
const config = {
  // 使用 Next.js 的 Jest 配置
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // 改为 jsdom 以支持 React 组件测试
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  
  // 忽略的目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
  ],
  
  // 模块路径映射（对应 tsconfig.json 中的 paths）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Setup 文件
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // 覆盖率配置
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 50,
      lines: 60,
    },
  },
  
  // 超时设置（因为涉及API调用）
  testTimeout: 60000,
  
  // 详细输出
  verbose: true,
  
  // TypeScript 转换配置
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true,
      },
    }],
  },
  
  // 支持的文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

module.exports = config;
