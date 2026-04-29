# 智镜决策系统 - 自动化测试文档

## 📋 测试体系概览

基于2026年最新Prompt测试实践（Braintrust、Maxim AI），建立的全方位测试体系。

### 测试分类

| 测试类型 | 文件 | 测试内容 | 数量 |
|---------|------|---------|------|
| **合约测试** | `contract.test.ts` | 四种模式输出规范 | 50+ |
| **单元测试** | `unit/json-parsing.test.ts` | JSON解析/验证逻辑 | 20+ |
| **多轮对话** | `multiturn.test.ts` | 上下文管理、信息累积 | 10+ |

### 测试场景覆盖

```
📁 test-cases/scenarios.json
├─ 信息不足场景 (3个)
├─ 信息充足场景 (3个)
├─ 用户语气测试 (4个)
├─ 非决策场景 (4个)
├─ 边界情况 (3个)
├─ 模式差异测试 (2个)
├─ 多轮对话场景 (1个)
└─ 领域专业性测试 (3个)
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

测试所需依赖已在 `package.json.update` 中列出。

### 2. 启动开发服务器

测试需要本地服务器运行在 `http://localhost:3000`：

```bash
npm run dev
```

### 3. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:unit        # 只运行单元测试
npm run test:contract    # 只运行合约测试
npm run test:multiturn   # 只运行多轮对话测试

# Watch模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

---

## 🧪 测试模式

### Mock模式（快速测试）

跳过实际API调用，使用模拟数据：

```bash
npm run test:mock
```

**适用场景**：
- 快速验证测试逻辑
- CI/CD流水线
- 开发阶段调试

### 真实API模式（推荐）

调用真实的DeepSeek API：

```bash
npm test
```

**适用场景**：
- 验证Prompt改动效果
- 发布前回归测试
- 性能测试

---

## 📊 测试用例详解

### 1. 合约测试 (contract.test.ts)

验证四种模式的输出规范。

#### 信息不足场景

```typescript
测试用例: "我想创业"
预期行为:
  ✓ entropy: 20-30
  ✓ score: 5 (占位值)
  ✓ risk_level: "信息不足，待评估"
  ✓ 应该询问问题
  ✓ Fast模式 < 400字
```

#### 信息充足场景

```typescript
测试用例: "我有100万，在北京开咖啡店，有3年经验..."
预期行为:
  ✓ entropy: 70-100
  ✓ score: 4-8分
  ✓ 正文 > 500字
  ✓ 包含多维度分析
  ✓ JSON一致性验证
```

#### 模式差异测试

```typescript
测试: Fast vs Standard vs Complete
验证:
  ✓ Fast模式最简短 (<400字)
  ✓ Standard模式中等 (>400字)
  ✓ Complete模式最详细 (>800字)
  ✓ RedTeam模式更保守 (评分更低)
```

### 2. 单元测试 (unit/json-parsing.test.ts)

测试JSON解析和验证逻辑。

```typescript
测试覆盖:
  ✓ 标准JSON块提取
  ✓ 带**加粗的JSON标记
  ✓ ```json代码块
  ✓ score与dimensions一致性
  ✓ risk_level与risk维度匹配
  ✓ 禁止0分（信息充足时）
  ✓ 边界情况处理
```

### 3. 多轮对话测试 (multiturn.test.ts)

验证上下文管理和信息累积。

```typescript
测试场景:
  ✓ 信息补充流程（entropy逐步提升）
  ✓ 引用之前的信息
  ✓ 风格保持一致
  ✓ 长对话不遗忘关键信息
```

---

## 📈 测试报告解读

### 成功示例

```
 PASS  __tests__/contract.test.ts (45.2s)
  合约测试 - Prompt输出规范
    信息不足场景
      ✓ 极简输入: 我想创业 (3241ms)
      ✓ 单一信息点: 考虑换工作 (2987ms)
    信息充足场景
      ✓ 详细创业计划 (5432ms)
      ✓ 买房决策 (4876ms)
    模式差异测试
      ✓ RedTeam模式应该更保守 (8765ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        45.2s
```

### 失败示例

```
 FAIL  __tests__/contract.test.ts
  合约测试 - Prompt输出规范
    信息不足场景
      ✕ 极简输入: 我想创业 (3241ms)

  ● 极简输入: 我想创业

    expect(received).toBe(expected)

    Expected: 5
    Received: 0

      at Object.<anonymous> (__tests__/contract.test.ts:45:32)

  一致性问题: score (0) 与 dimensions平均值 (5.0) 差距过大
```

**解读**：模型返回了score=0，违反了占位值规则。需要修改Prompt。

---

## 🔧 常见问题

### Q1: 测试运行很慢怎么办？

**A**: 使用Mock模式或并行测试：

```bash
# Mock模式（秒级完成）
npm run test:mock

# 并行测试（快50%）
jest --maxWorkers=4
```

### Q2: API调用失败？

**A**: 检查配置：

```bash
# 1. 确认服务器运行
npm run dev

# 2. 检查API Key（在 setup.ts 中已配置）
cat __tests__/setup.ts | grep API_KEY

# 3. 查看详细错误
npm test -- --verbose
```

### Q3: 如何添加新测试用例？

**A**: 编辑 `test-cases/scenarios.json`：

```json
{
  "信息不足场景": [
    {
      "id": "insufficient_004",
      "name": "你的测试名称",
      "input": "用户输入",
      "expectedBehavior": {
        "entropy": { "min": 20, "max": 30 },
        "score": 5
      },
      "tags": ["信息收集", "领域"]
    }
  ]
}
```

### Q4: 如何调试单个测试？

**A**: 使用 `--testNamePattern`：

```bash
# 只运行包含"极简输入"的测试
npm test -- --testNamePattern="极简输入"

# 只运行某个文件
npm test -- contract.test.ts
```

---

## 📝 最佳实践

### 1. 改Prompt后必跑测试

```bash
# 修改 route.ts 后
npm run test:contract

# 修改 chat-area.tsx 后
npm run test:unit
```

### 2. 定期更新测试用例

当发现新的edge case时，立即添加到 `scenarios.json`。

### 3. CI/CD集成

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:ci
```

### 4. 定期检查覆盖率

```bash
npm run test:coverage
# 目标：80%+ 覆盖率
```

---

## 🎯 测试目标与验收标准

### 短期目标（1周）

- [x] 建立基础测试框架
- [x] 覆盖50+测试场景
- [ ] 单元测试覆盖率 > 60%
- [ ] 合约测试通过率 > 90%

### 中期目标（1个月）

- [ ] 集成到CI/CD
- [ ] 测试用例库 > 100个
- [ ] 覆盖率 > 80%
- [ ] 自动化回归测试

### 长期目标（3个月）

- [ ] A/B测试Prompt
- [ ] 性能基准测试
- [ ] 用户真实场景测试库
- [ ] 自动生成测试报告

---

## 📚 参考资源

### 2026年最新实践

- **Braintrust**: 合约测试框架
- **Maxim AI**: Prompt评估最佳实践
- **Arize AX**: 结构化输出规范
- **Promptfoo**: 开源Prompt测试工具

### 相关文档

- [优化方案](../优化方案_基于2026最新技术.md)
- [技术总结](../AI系统上下文优化与Prompt测试最新技术总结_2026.md)

---

## 🤝 贡献指南

### 添加新测试场景

1. 在 `scenarios.json` 中添加用例
2. 确保有 `expectedBehavior`
3. 添加相关 `tags`
4. 运行测试验证

### 报告问题

- 测试失败：提供完整错误日志
- 性能问题：附上执行时间
- 建议改进：说明具体场景

---

**最后更新**: 2026-01-19
**维护者**: 智镜团队
**联系方式**: 参考项目README
