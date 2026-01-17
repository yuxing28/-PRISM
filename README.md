# Multi-Dimensional Decision Assistant (MVP v1.0)

## 项目简介 (Project Overview)
这是一个基于 **Next.js 16 + Tailwind v4** 构建的多维决策辅助系统。
核心功能包含：
- **静态液态玻璃 (Static Liquid Glass)** 视觉风格 ("Morning Mist" 主题)。
- **红队对抗模式 (Red Team Mode)**：AI 模拟反方角色进行决策挑战。
- **信息熵仪表盘 (Entropy Dashboard)**：可视化决策信息完备度。
- **DeepSeek API 集成**：流式传输 AI 响应。

## 快速开始 (How to Start)

### 1. 配置环境变量
在项目根目录创建 `.env.local` 文件，并填入您的 API Key：
```bash
DEEPSEEK_API_KEY=sk-your-key-here
```
*(如果不配置 Key，界面仍可运行，但无法进行 AI 对话)*

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 访问页面
打开浏览器访问：[http://localhost:3000](http://localhost:3000)

## 项目结构
- `/app`: 页面路由 (Page Router)
- `/components`: UI 组件
  - `/layout`: 侧边栏、主布局
  - `/chat`: 聊天区域、输入框
  - `/ui`: 通用基础组件
- `/lib`: 工具函数与状态管理 (Zustand Store)
